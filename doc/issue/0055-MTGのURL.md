- MTGのURL取得ロジックを実装
    - 下記のコードと同じロジックで取得する
    - URL取得ロジック以外は参考にしないこと

```
import { Todo } from "../logic/Todo";
import { Project, Taskcode } from "../logic/Project";
import { calcDur } from "../utils/Datetime";
import { getCalendarEvents } from "../utils/Command";

export type GoogleCalendarEvent = {
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  summary: string;
  created: string;
  updated: string;
  eventType?: string;
  hangoutLink?: string;
  description?: string;
};

export const concatTaskcodes = (projects: Project[]): Taskcode[] => {
  return projects.reduce((accu, project) => accu.concat(project.taskcodes), []);
};

export const guessTaskcode = (
  event: Partial<GoogleCalendarEvent>,
  projects: Project[]
): string => {
  for (const taskcode of concatTaskcodes(projects)) {
    for (const keyword of taskcode.keywords || []) {
      if (event.summary.includes(keyword)) {
        return taskcode.taskcode;
      }
    }
  }
  return "";
};

export const getMeetingUrlFromDescription = (
  event: Partial<GoogleCalendarEvent>
): string | null => {
  if (!event.description) return null;

  // zoom
  const zoom_regexp =
    /https:\/\/(\w+\.)?zoom\.us\/[\w!?/+\-_~;.,*&@#$%()'\[\]=]+/;
  const zoom_match = event.description?.match(zoom_regexp);
  if (zoom_match !== null) return zoom_match[0];

  // teams
  const teams_regexp =
    /https:\/\/teams\.microsoft\.com\/[\w!?/+\-_~;.,*&@#$%()'\[\]=]+/;
  const teams_match = event.description?.match(teams_regexp);
  if (teams_match !== null) return teams_match[0];

  return null;
};

export const getMeetingUrlFromHangoutLink = (
  event: Partial<GoogleCalendarEvent>
): string | null => {
  return event.hangoutLink ?? null;
};

const getMeetingUrl = (event: Partial<GoogleCalendarEvent>): string => {
  return (
    getMeetingUrlFromDescription(event) ??
    getMeetingUrlFromHangoutLink(event) ??
    ""
  );
};

const getMeeting = (
  event: Partial<GoogleCalendarEvent>,
  projects: Project[]
): Todo => {
  const taskcode = guessTaskcode(event, projects);
  const newEvent: Todo = {
    id: `MTG ${event.start.dateTime} ${event.created}`,
    order: `MTG ${event.start.dateTime} ${event.created}`,
    summary: event.summary,
    taskcode: taskcode,
    estimate: getEstimate(event.start.dateTime, event.end.dateTime).toString(),
    times: [
      {
        start: getDt(event.start.dateTime),
        end: getDt(event.end.dateTime),
      },
    ],
    memo: getMeetingUrl(event),
    created: getDt(event.created),
    updated: getDt(event.updated),
    done: "",
  };
  return newEvent;
};

const isMeetingEvent = (event: Partial<GoogleCalendarEvent>): boolean => {
  // 勤務場所は除外
  if (event.eventType === "workingLocation") return false;
  // 離席系は除外（休暇は工数につけるので除外しない）
  if (event.summary.startsWith("[離席]")) return false;
  if (event.summary.startsWith("[休憩]")) return false;
  if (event.summary.startsWith("[休日]")) return false;
  // 作業は除外
  if (event.summary.startsWith("[作業]")) return false;
  // 時間指定なしの予定は除外
  if (event.start.dateTime === undefined) return false;
  return true;
};

const filterEvent = (event: Partial<GoogleCalendarEvent>): boolean => {
  if (!isMeetingEvent(event)) return false;
  return true;
};

export const getMeetings = async (
  date: string,
  projects: Project[]
): Promise<Todo[]> => {
  const events_str = await getCalendarEvents(date);
  return getMeetingsWithTaskcode(JSON.parse(events_str), projects);
};

export const getMeetingsWithTaskcode = (
  events: Partial<GoogleCalendarEvent>[],
  projects: Project[]
): Todo[] => {
  return events
    .filter((event) => filterEvent(event))
    .map((event) => getMeeting(event, projects));
};

const getDt = (datetime: string): string => {
  return datetime.replace("T", " ").slice(0, 19);
};

const getEstimate = (start: string, end: string): number => {
  return Math.round(calcDur(getDt(start), getDt(end)) / 60);
};
```
