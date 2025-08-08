import type { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type moment from "moment";

async function queryDayByDate(
  client: Client,
  date: moment.Moment,
): Promise<PageObjectResponse | PartialPageObjectResponse> {
  const dateString = date.format("MMM D, YYYY");
  const databaseId = process.env.DAYS_DB_ID;
  if (!databaseId) {
    throw new Error("DAYS_DB_ID environment variable is not set.");
  }
  const results = await client.databases.query({
    database_id: databaseId,
    filter: {
      property: "Name",
      rich_text: {
        contains: dateString,
      },
    },
  });

  console.assert(results.object === "list");
  let day: PageObjectResponse | PartialPageObjectResponse | undefined =
    undefined;

  if (results.results.length === 0) {
    day = await createDay(client, date);
  } else {
    day = results.results[0] as PageObjectResponse | PartialPageObjectResponse;
  }

  if (!day) {
    throw new Error(
      `Could not find or create day for date ${date.format("YYYY-MM-DD")}`,
    );
  }
  return day;
}

async function queryWeekByDate(
  client: Client,
  date: moment.Moment,
): Promise<PageObjectResponse | PartialPageObjectResponse> {
  const startOfWeekString = date.clone().startOf("isoWeek").format("MMM D, YYYY");
  const endOfWeekString = date.clone().endOf("isoWeek").format("MMM D, YYYY");
  const weekName = `${startOfWeekString} — ${endOfWeekString}`;
  const databaseId = process.env.WEEKS_DB_ID;
  if (!databaseId) {
    throw new Error("WEEKS_DB_ID environment variable is not set.");
  }
  const results = await client.databases.query({
    database_id: databaseId,
    filter: {
      property: "Name",
      rich_text: {
        contains: weekName,
      },
    },
  });

  console.assert(results.object === "list");
  let week: PageObjectResponse | PartialPageObjectResponse | undefined =
    undefined;

  if (results.results.length === 0) {
    week = await createWeek(client, date);
  } else {
    week = results.results[0] as PageObjectResponse | PartialPageObjectResponse;
  }

  if (!week) {
    throw new Error(
      `Could not find or create week for date ${date.format("YYYY-MM-DD")}`,
    );
  }

  if (
    "properties" in week &&
    "Related to Months (Weeks)" in week.properties &&
    week.properties["Related to Months (Weeks)"].type === "relation" &&
    week.properties["Related to Months (Weeks)"].relation.length === 0
  ) {
    await linkWeekToMonth(client, date, week.id);
  }
  return week;
}

async function queryMonthByDate(
  client: Client,
  date: moment.Moment,
): Promise<PageObjectResponse | PartialPageObjectResponse> {
  const monthName = date.clone().startOf("month").format("MMM YYYY");
  const databaseId = process.env.MONTHS_DB_ID;
  if (!databaseId) {
    throw new Error("MONTHS_DB_ID environment variable is not set.");
  }
  const results = await client.databases.query({
    database_id: databaseId,
    filter: {
      property: "Name",
      rich_text: {
        contains: monthName,
      },
    },
  });

  console.assert(results.object === "list");
  if (results.results.length === 0) {
    return await createMonth(client, date);
  }

  const month = results.results[0] as
    | PageObjectResponse
    | PartialPageObjectResponse;
  if (!month) {
    throw new Error(
      `Could not find or create month for date ${date.format("YYYY-MM-DD")}`,
    );
  }
  return month;
}

async function createDay(
  client: Client,
  date: moment.Moment,
): Promise<PageObjectResponse | PartialPageObjectResponse> {
  const dateString = date.format("MMM D, YYYY");
  const databaseId = process.env.DAYS_DB_ID;
  if (!databaseId) {
    throw new Error("DAYS_DB_ID environment variable is not set.");
  }

  const results = await client.pages.create({
    parent: {
      type: "database_id",
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: dateString,
            },
          },
        ],
      },
      Date: {
        date: {
          start: date.format("YYYY-MM-DD"),
        },
      },
    },
  });

  return results;
}

async function createWeek(
  client: Client,
  date: moment.Moment,
): Promise<PageObjectResponse | PartialPageObjectResponse> {
  const startOfWeek = date.clone().startOf("isoWeek");
  const endOfWeek = date.clone().endOf("isoWeek");
  const weekName = `${startOfWeek.format("MMM D, YYYY")} — ${endOfWeek.format("MMM D, YYYY")}`;
  const databaseId = process.env.WEEKS_DB_ID;
  if (!databaseId) {
    throw new Error("WEEKS_DB_ID environment variable is not set.");
  }

  const results = await client.pages.create({
    parent: {
      type: "database_id",
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: weekName,
            },
          },
        ],
      },
      "Time span": {
        date: {
          start: startOfWeek.format("YYYY-MM-DD"),
          end: endOfWeek.format("YYYY-MM-DD"),
        },
      },
    },
  });

  return results;
}

async function createMonth(
  client: Client,
  date: moment.Moment,
): Promise<PageObjectResponse | PartialPageObjectResponse> {
  const monthName = date.clone().startOf("month").format("MMM YYYY");
  const databaseId = process.env.MONTHS_DB_ID;
  if (!databaseId) {
    throw new Error("MONTHS_DB_ID environment variable is not set.");
  }

  const results = await client.pages.create({
    parent: {
      type: "database_id",
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: monthName,
            },
          },
        ],
      },
    },
  });

  return results;
}

export async function linkDayToWeek(
  client: Client,
  date: moment.Moment,
  dayId: string | undefined = undefined,
  weekId: string | undefined = undefined,
) {
  console.info(`Linking day ${date.format("MMM D, YYYY")} to week`);

  let targetDayId = dayId;
  let targetWeekId = weekId;

  if (targetDayId === undefined) {
    const day = await queryDayByDate(client, date);
    targetDayId = day.id;
    if (
      "properties" in day &&
      "Week" in day.properties &&
      day.properties.Week.type === "relation" &&
      day.properties.Week.relation.length > 0
    ) {
      console.info("Already linked!");
      return;
    }
  }

  if (targetWeekId === undefined) {
    const week = await queryWeekByDate(client, date);
    targetWeekId = week.id;
  }

  if (!targetDayId) {
    throw new Error("Could not determine day ID for linking.");
  }
  if (!targetWeekId) {
    throw new Error("Could not determine week ID for linking.");
  }

  await client.pages.update({
    page_id: targetDayId,
    properties: {
      Week: {
        relation: [
          {
            id: targetWeekId,
          },
        ],
      },
    },
  });

  console.info("Linked successfully!");
}

async function linkWeekToMonth(
  client: Client,
  date: moment.Moment,
  weekId: string | undefined = undefined,
  monthIds: string[] | undefined = undefined,
) {
  const startOfWeek = date.clone().startOf("isoWeek");
  const startOfWeekString = startOfWeek.format("MMM D, YYYY");
  const endOfWeek = date.clone().endOf("isoWeek");
  const endOfWeekString = endOfWeek.format("MMM D, YYYY");
  const weekName = `${startOfWeekString} — ${endOfWeekString}`;
  console.info(`Linking week ${weekName} to month`);

  let targetWeekId = weekId;
  let targetMonthIds = monthIds;

  if (targetWeekId === undefined) {
    const week = await queryWeekByDate(client, date);
    targetWeekId = week.id;
    if (
      "properties" in week &&
      "Related to Months (Weeks)" in week.properties &&
      week.properties["Related to Months (Weeks)"].type === "relation" &&
      week.properties["Related to Months (Weeks)"].relation.length > 0
    ) {
      console.info("Already linked!");
      return;
    }
  }

  if (targetMonthIds === undefined) {
    const startMonth = await queryMonthByDate(client, startOfWeek);
    const initialMonthIds = [startMonth.id];
    if (startOfWeek.month() !== endOfWeek.month()) {
      const endMonth = await queryMonthByDate(client, endOfWeek);
      initialMonthIds.push(endMonth.id);
    }
    targetMonthIds = initialMonthIds;
  }

  if (!targetWeekId) {
    throw new Error("Could not determine week ID for linking.");
  }
  if (!targetMonthIds) {
    throw new Error("Could not determine month IDs for linking.");
  }

  await client.pages.update({
    page_id: targetWeekId,
    properties: {
      "Related to Months (Weeks)": {
        relation: targetMonthIds.map((monthId) => ({
          id: monthId,
        })),
      },
    },
  });

  console.info("Linked successfully!");
}
