import axios, { AxiosResponse } from 'axios';
import { createObjectCsvWriter } from 'csv-writer';

interface ParsedJsonData {
  name: string;
  object_id: string;
  receiver: string;
}

interface DataItem {
  id: {
    txDigest: string;
    eventSeq: string;
  };
  packageId: string;
  transactionModule: string;
  sender: string;
  type: string;
  parsedJson: ParsedJsonData;
  bcs: string;
  timestampMs: string;
}

interface ApiResponse {
  result: {
    data: DataItem[];
    nextPage?: number;
    hasNextPage: boolean;
    nextCursor: {
      txDigest: string;
      eventSeq: string;
    }
  }
}

async function fetchPaginatedData(endpoint: string, namePrefix: string, criteria: any): Promise<ParsedJsonData[]> {
  let cursor = null
  let hasNextPage = true;
  let responseData: ParsedJsonData[] = [];

  while (hasNextPage) {
    try {
      const response: AxiosResponse<ApiResponse> = await axios.post(endpoint, {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "suix_queryEvents",
        "params": [
          criteria,
          cursor,
          null,
          true,
        ]
      });

      const parsedJsonData = response.data.result.data.map(item => item.parsedJson).filter(x => x.name.toLowerCase().startsWith(namePrefix.toLowerCase()));
      responseData = responseData.concat(parsedJsonData);
      hasNextPage = response.data.result.hasNextPage
      cursor = response.data.result.nextCursor

      console.log(responseData.length)

      // if (responseData.length > 100) break;
    } catch (error) {
      console.error('Error fetching paginated data:', error);
      break;
    }
  }

  // Sort the data by name
  responseData.sort((a, b) => a.name.localeCompare(b.name));

  return responseData;
}

// Function to export the parsedJson data into a CSV file
async function exportDataToCSV(data: ParsedJsonData[], filePath: string): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'name', title: 'Name' },
      { id: 'receiver', title: 'Minter' },
      { id: 'object_id', title: 'Object ID' },
    ],
  });

  try {
    await csvWriter.writeRecords(data);
    console.log(`Data exported to CSV successfully at ${filePath}`);
  } catch (error) {
    console.error('Error exporting data to CSV:', error);
  }
}

// Usage
const endpoint = 'https://explorer-rpc.mainnet.sui.io';
const namePrefix = 'poopzter sui'
const criteria = {"MoveModule":{"package":"0x31528e6282aea6ef733a795c648aefab755b085f58894f23d2a5b323004055c1", "module":"drops"}}
const filePath = 'poopzter-minter.csv';

fetchPaginatedData(endpoint, namePrefix, criteria)
  .then((data) => {
    return exportDataToCSV(data, filePath);
  })
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1)
  });