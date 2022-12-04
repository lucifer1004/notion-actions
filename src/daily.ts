import { Client } from "@notionhq/client";
import moment from "moment";

async function queryDayByDate(client: Client, date: moment.Moment) {
  const dateString = date.format("MMM D, YYYY");
  const results = await client.databases.query({
    database_id: process.env.DAYS_DB_ID!!,
    filter: {
      property: "Name",
      rich_text: {
        contains: dateString,
      },
    },
  });

  console.assert(results.object == "list");
  let day: any = undefined;

  if (results.results.length === 0) {
    day = await createDay(client, date);
  } else {
    day = results.results[0];
  }

  if (
    day.properties.Week.relation.length === 0
  ) {
    await linkDayToWeek(client, date, day.id);
  }
  return day;
}

async function queryWeekByDate(client: Client, date: moment.Moment) {
  const startOfWeekString = date.startOf("isoWeek").format("MMM D, YYYY");
  const endOfWeekString = date.endOf("isoWeek").format("MMM D, YYYY");
  const weekName = `${startOfWeekString} — ${endOfWeekString}`;
  const results = await client.databases.query({
    database_id: process.env.WEEKS_DB_ID!!,
    filter: {
      property: "Name",
      rich_text: {
        contains: weekName,
      },
    },
  });

  console.assert(results.object == "list");
  let week: any = undefined;

  if (results.results.length === 0) {
    week = await createWeek(client, date);
  } else {
    week = results.results[0];
  }

  if (
    week.properties["Related to Months (Weeks)"].relation.length === 0
  ) {
    await linkWeekToMonth(client, date, (week as any).id);
  }
  return week;
}

async function queryMonthByDate(client: Client, date: moment.Moment) {
  const monthName = date.startOf("month").format("MMM YYYY");
  const results = await client.databases.query({
    database_id: process.env.MONTHS_DB_ID!!,
    filter: {
      property: "Name",
      rich_text: {
        contains: monthName,
      },
    },
  });

  console.assert(results.object == "list");
  if (results.results.length === 0) {
    return await createMonth(client, date);
  }

  const month = results.results[0];
  return month;
}

async function createDay(client: Client, date: moment.Moment) {
  const dateString = date.format("MMM D, YYYY");

  const results = await client.pages.create({
    parent: {
      type: "database_id",
      database_id: process.env.DAYS_DB_ID!!,
    },
    properties: {
      Name: {
        title: [{
          text: {
            content: dateString,
          },
        }],
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

async function createWeek(client: Client, date: moment.Moment) {
  const startOfWeekString = date.startOf("isoWeek").format("MMM D, YYYY");
  const endOfWeekString = date.endOf("isoWeek").format("MMM D, YYYY");
  const weekName = `${startOfWeekString} — ${endOfWeekString}`;

  const results = await client.pages.create({
    parent: {
      type: "database_id",
      database_id: process.env.WEEKS_DB_ID!!,
    },
    properties: {
      Name: {
        title: [{
          text: {
            content: weekName,
          },
        }],
      },
      "Time span": {
        date: {
          start: date.startOf("isoWeek").format("YYYY-MM-DD"),
          end: date.endOf("isoWeek").format("YYYY-MM-DD"),
        },
      },
    },
  });

  return results;
}

async function createMonth(client: Client, date: moment.Moment) {
  const monthName = date.startOf("month").format("MMM YYYY");

  const results = await client.pages.create({
    parent: {
      type: "database_id",
      database_id: process.env.MONTHS_DB_ID!!,
    },
    properties: {
      Name: {
        title: [{
          text: {
            content: monthName,
          },
        }],
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

  if (dayId === undefined) {
    const day = await queryDayByDate(client, date);
    dayId = (day as any).id;
    if ((day as any).properties.Week.relation.length > 0) {
      console.info("Already linked!");
      return;
    }
  }

  if (weekId === undefined) {
    const week = await queryWeekByDate(client, date);
    weekId = (week as any).id;
  }

  await client.pages.update({
    page_id: dayId!!,
    properties: {
      Week: {
        relation: [
          {
            id: weekId!!,
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
  const startOfWeek = date.startOf("isoWeek");
  const startOfWeekString = startOfWeek.format("MMM D, YYYY");
  const endOfWeek = date.endOf("isoWeek");
  const endOfWeekString = endOfWeek.format("MMM D, YYYY");
  const weekName = `${startOfWeekString} — ${endOfWeekString}`;
  console.info(`Linking week ${weekName} to month`);

  if (weekId === undefined) {
    const week = await queryWeekByDate(client, date);
    weekId = (week as any).id;
    if ((week as any).properties.Month.relation.length > 0) {
      console.info("Already linked!");
      return;
    }
  }

  if (monthIds === undefined) {
    const startMonth = await queryMonthByDate(client, startOfWeek);
    monthIds = [startMonth.id];
    if (startOfWeek.month() !== endOfWeek.month()) {
      const endMonth = await queryMonthByDate(client, endOfWeek);
      monthIds.push(endMonth.id);
    }
  }

  await client.pages.update({
    page_id: weekId!!,
    properties: {
      "Related to Months (Weeks)": {
        relation: monthIds!!.map((monthId) => ({
          id: monthId,
        })),
      },
    },
  });

  console.info("Linked successfully!");
}
