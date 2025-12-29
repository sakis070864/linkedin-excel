import { Client } from "@microsoft/microsoft-graph-client";
import { InteractionRequiredAuthError, IPublicClientApplication } from "@azure/msal-browser";
import { FILE_NAME, SCOPES, TABLE_HEADERS, TABLE_NAME } from "../constants";
import { Invoice, Worksheet } from "../types";

// --- MOCK DATA CONFIGURATION ---
// OTAN EISE ETOIMOS GIA TA PRAGMATIKA DEDOMENA: Allakse ayto se false
export const IS_DEMO_MODE = true; 

let graphClient: Client | undefined;

// --- MOCK DATA GENERATOR ---
const generateMockData = (): Invoice[] => {
  const customers = [
    "TechFlow Solutions", "Global Innovations", "Alpha Stream Inc", 
    "NextGen Systems", "BlueSky Logistics", "Quantum Dynamics", 
    "SilverLine Networks", "Peak Performance", "EcoSmart Energy", 
    "Urban Architects", "Nexus Digital", "Horizon Ventures"
  ];

  const statuses: ('Paid' | 'Pending' | 'Overdue')[] = ['Paid', 'Paid', 'Paid', 'Pending', 'Pending', 'Overdue'];
  
  const data: Invoice[] = [];
  const startDate = new Date(2024, 0, 1);
  const endDate = new Date(2025, 11, 31);

  for (let i = 0; i < 60; i++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const dateStr = randomDate.toISOString().split('T')[0];
    
    const amount = Math.floor(Math.random() * 4900) + 100;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const credit = status === 'Paid' ? amount : (Math.random() > 0.8 ? Math.floor(amount * 0.2) : 0);

    data.push({
      id: `mock-${i}`,
      customerName: customers[Math.floor(Math.random() * customers.length)],
      invoiceNumber: `INV-${2024000 + i}`,
      invoiceDate: dateStr,
      invoiceAmount: amount,
      status: status,
      credit: credit,
      rowIndex: i
    });
  }
  
  return data.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
};

// In-memory store for mock updates
let mockStore: Invoice[] = generateMockData();

// Initialize the Graph Client (Skip in Demo Mode)
export const ensureClient = (msalInstance: IPublicClientApplication, account: any) => {
  if (IS_DEMO_MODE) return; 

  if (graphClient) return graphClient;

  graphClient = Client.init({
    authProvider: async (done) => {
      try {
        const response = await msalInstance.acquireTokenSilent({
          ...SCOPES,
          account: account,
        });
        done(null, response.accessToken);
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
            console.error("Interaction required", error);
        } 
        done(error as Error, null);
      }
    },
  });
  return graphClient;
};

// --- Operations ---

export const ensureFinancialFile = async () => {
  if (IS_DEMO_MODE) {
    return;
  }
  if (!graphClient) throw new Error("Graph Client not initialized");

  try {
    await graphClient.api(`/me/drive/root:/${FILE_NAME}`).get();
  } catch (error: any) {
    if (error.statusCode === 404) {
      const csvHeader = TABLE_HEADERS.join(",");
      const initialRow = "\nStart,INV-000,2024-01-01,0,Paid,0"; 
      await graphClient.api(`/me/drive/root:/${FILE_NAME}:/content`).put(csvHeader + initialRow);
    } else {
      throw error;
    }
  }
};

export const getWorksheets = async (): Promise<Worksheet[]> => {
  if (IS_DEMO_MODE) {
    return [
      { id: "1", name: "Q1-2024", position: 1, visibility: "Visible" },
      { id: "2", name: "Q2-2024", position: 2, visibility: "Visible" },
      { id: "3", name: "Q3-2024", position: 3, visibility: "Visible" },
      { id: "4", name: "Q4-2024", position: 4, visibility: "Visible" },
      { id: "5", name: "FY-2025", position: 5, visibility: "Visible" },
    ];
  }

  if (!graphClient) throw new Error("Graph Client not initialized");
  try {
    const response = await graphClient.api(`/me/drive/root:/${FILE_NAME}:/workbook/worksheets`).get();
    return response.value.map((ws: any) => ({
      id: ws.id,
      name: ws.name,
      position: ws.position,
      visibility: ws.visibility
    }));
  } catch (e) {
    console.error("Error fetching sheets", e);
    return [];
  }
};

export const getSheetData = async (sheetName: string): Promise<Invoice[]> => {
  if (IS_DEMO_MODE) {
    return new Promise(resolve => setTimeout(() => resolve(mockStore.map((inv, i) => ({...inv, rowIndex: i}))), 600)); 
  }

  if (!graphClient) throw new Error("Graph Client not initialized");

  const tablesUrl = `/me/drive/root:/${FILE_NAME}:/workbook/worksheets('${sheetName}')/tables`;
  
  try {
    const tablesResponse = await graphClient.api(tablesUrl).get();
    let tableId = tablesResponse.value.find((t: any) => t.name === TABLE_NAME)?.id;

    if (!tableId) {
        try {
            const range = await graphClient.api(`/me/drive/root:/${FILE_NAME}:/workbook/worksheets('${sheetName}')/usedRange`).get();
            if(!range.values || range.values.length <= 1) return [];
            
            return range.values.slice(1).map((row: any[], index: number) => ({
                customerName: row[0],
                invoiceNumber: row[1],
                invoiceDate: excelDateToJS(row[2]),
                invoiceAmount: Number(row[3]),
                status: row[4],
                credit: Number(row[5]),
                rowIndex: index
            }));
        } catch (err) {
            return [];
        }
    }

    const rowsResponse = await graphClient.api(tablesUrl + `/${TABLE_NAME}/rows`).get();
    
    return rowsResponse.value.map((row: any, index: number) => {
      const cellValues = row.values[0];
      return {
        customerName: cellValues[0],
        invoiceNumber: String(cellValues[1]),
        invoiceDate: excelDateToJS(cellValues[2]),
        invoiceAmount: Number(cellValues[3]),
        status: cellValues[4],
        credit: Number(cellValues[5]),
        rowIndex: index
      };
    });

  } catch (error) {
    console.error("Error getting sheet data", error);
    return [];
  }
};

export const addInvoices = async (sheetName: string, invoices: Invoice[]) => {
  if (IS_DEMO_MODE) {
    mockStore = [...mockStore, ...invoices];
    return;
  }

  if (!graphClient) throw new Error("Graph Client not initialized");
  
  const values = invoices.map(inv => [
    inv.customerName,
    inv.invoiceNumber,
    inv.invoiceDate,
    inv.invoiceAmount,
    inv.status,
    inv.credit
  ]);

  const url = `/me/drive/root:/${FILE_NAME}:/workbook/worksheets('${sheetName}')/tables/${TABLE_NAME}/rows`;
  await graphClient.api(url).post({ values: values, index: null });
};

// --- NEW FULL UPDATE FUNCTION ---
export const updateInvoice = async (sheetName: string, rowIndex: number, invoice: Invoice) => {
  if (IS_DEMO_MODE) {
    if (mockStore[rowIndex]) {
      mockStore[rowIndex] = { ...invoice, rowIndex };
    }
    return;
  }

  if (!graphClient) throw new Error("Graph Client not initialized");
  
  const newValues = [
    invoice.customerName,
    invoice.invoiceNumber,
    invoice.invoiceDate,
    invoice.invoiceAmount,
    invoice.status,
    invoice.credit
  ];

  await graphClient.api(`/me/drive/root:/${FILE_NAME}:/workbook/worksheets('${sheetName}')/tables/${TABLE_NAME}/rows/itemAt(index=${rowIndex})`).patch({
    values: [newValues]
  });
};

export const updateInvoiceStatus = async (sheetName: string, rowIndex: number, newStatus: string) => {
    if (IS_DEMO_MODE) {
        if (mockStore[rowIndex]) {
            mockStore[rowIndex].status = newStatus as any;
        }
        return;
    }

    if (!graphClient) throw new Error("Graph Client not initialized");
    
    const rowRes = await graphClient.api(`/me/drive/root:/${FILE_NAME}:/workbook/worksheets('${sheetName}')/tables/${TABLE_NAME}/rows/itemAt(index=${rowIndex})`).get();
    const currentValues = rowRes.values[0];
    currentValues[4] = newStatus;

    await graphClient.api(`/me/drive/root:/${FILE_NAME}:/workbook/worksheets('${sheetName}')/tables/${TABLE_NAME}/rows/itemAt(index=${rowIndex})`).patch({
        values: [currentValues]
    });
};

export const deleteInvoice = async (sheetName: string, rowIndex: number) => {
  if (IS_DEMO_MODE) {
    mockStore = mockStore.filter((_, index) => index !== rowIndex);
    return;
  }

  if (!graphClient) throw new Error("Graph Client not initialized");

  await graphClient.api(`/me/drive/root:/${FILE_NAME}:/workbook/worksheets('${sheetName}')/tables/${TABLE_NAME}/rows/itemAt(index=${rowIndex})`).delete();
};

const excelDateToJS = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0];

    if (typeof value === 'number') {
        const utc_days  = Math.floor(value - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toISOString().split('T')[0];
    }

    if (typeof value === 'string') {
        if (value.includes('-') && value.length === 10) return value;
        const timestamp = Date.parse(value);
        if (!isNaN(timestamp)) {
            return new Date(timestamp).toISOString().split('T')[0];
        }
    }

    return new Date().toISOString().split('T')[0];
}