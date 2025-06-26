import axios from "axios";

export enum PLATFORM {
  CODEFORCES = "codeforces.com",
  ATCODER = "atcoder.jp",
  CODECHEF = "codechef.com",
}

interface ContestQueryParams {
  event?: string;
  platforms?: PLATFORM[];
  orderBy?: string;
  limit?: number;
  offset?: number;
  withProblems?: boolean;
  timeSpan?: [string, string];
}

/**
 * Query contests from CList by query params.
 *
 * @param {ContestQueryParams} params - Params used for the query.
 */
export async function queryContests(params: ContestQueryParams = {}) {
  const resp = await axios.get("https://clist.by/api/v2/contest/", {
    headers: {
      Authorization: `ApiKey ${process.env.CLIST_USERNAME}:${process.env.CLIST_TOKEN}`,
    },
    params: {
      event: params.event,
      resource: params.platforms?.join(","),
      order_by: params.orderBy,
      with_problems: params.withProblems,
      limit: params.limit,
      offset: params.offset,
      start__lte: params.timeSpan?.[1],
      end__gte: params.timeSpan?.[0],
    },
  });

  resp.data.objects.forEach((contest: any) => console.log(contest));
}

/**
 * Query a contest from CList by ID.
 *
 * @param {number} id - ID of the contest to retrieve.
 */
export async function queryContest(id: number) {
  const resp = await axios.get(`https://clist.by/api/v2/contest/${id}/`, {
    headers: {
      Authorization: `ApiKey ${process.env.CLIST_USERNAME}:${process.env.CLIST_TOKEN}`,
    },
  });
  console.log(resp.data);
}
