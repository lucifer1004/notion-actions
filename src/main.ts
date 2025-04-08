import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import moment from "moment";
import { PLATFORM, queryContest, queryContests } from "./clist";
import { linkDayToWeek } from "./daily";
import { queryDatabaseIdByName } from "./utils";

dotenv.config();

// Initializing a client
const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

(async () => {
    for (let i = 1; i >= 0; i--) {
        const date = moment().subtract(i, "days");
        await linkDayToWeek(notion, date);
    }
})();

// (async () => {
//     const db = await queryDatabaseIdByName(notion, "Contest");
//     console.log(db);
// })();

// ; (async () => {
//   const cf = (await notion.search({
//     query: 'Codeforces Round',
//     filter: {
//       property: 'object',
//       value: 'page',
//     }
//   })).results;
//   console.log(cf)

// const contestDb = (await notion.search({
//   query: 'CP Contests',
//   filter: {
//     property: 'object',
//     value: 'database',
//   }
// })).results[0];

// const contestDb = await notion.databases.retrieve({ database_id: process.env.CONTEST_DB_ID!! });

// const contests = (await notion.databases.query({
//   database_id: process.env.CONTEST_DB_ID!!,
//   sorts: [
//     {
//       property: 'Duration',
//       direction: 'ascending',
//     },
//   ],
// })).results;

// contests.forEach(contest => {
//   console.log((contest as any).properties.Name.title[0].text)
// });
// })();

// ;(async () => {
//   const now = moment();

//   await queryContests({
//     platforms: [PLATFORM.CODEFORCES, PLATFORM.ATCODER],
//     orderBy: "-end",
//     withProblems: false,
//     timeSpan: [now.subtract(7, 'days').format(), now.add(7, 'days').format()],
//     limit: 10,
//   })

//   // await queryContest(32720982)
// })();
