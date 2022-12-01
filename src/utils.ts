import { Client } from "@notionhq/client";

export async function queryDatabaseIdByName(client: Client, name: string) {
    const results = (await client.search({
        query: name,
        filter: {
            property: "object",
            value: "database",
        },
    })).results;

    console.log(results[0].id);
}
