import type { Client } from "@notionhq/client";

export async function queryDatabaseIdByName(client: Client, name: string): Promise<string> {
  const search = await client.search({
    query: name,
    filter: {
      property: "object",
      value: "database",
    },
  });

  if (search.object !== "list" || search.results.length === 0) {
    throw new Error(`Database not found by name: ${name}`);
  }

  const first = search.results[0] as { id: string };
  return first.id;
}
