export const REPORT_QUESTIONS = {
  severity: {
    type: "score",
    instructions:
      "How severe is the defect itself for a Plainsboro operator? Score the hazard, not the ticket status. An In Progress High pothole is still High. Out-of-town issues are Low for Plainsboro even if they are dangerous somewhere else.",
    criteria: [
      "Low: cosmetic, faded markings, or not Plainsboro's job",
      "Medium: real defect to schedule this week in Plainsboro",
      "High: same-day safety or accessibility hazard inside Plainsboro",
    ],
  },
  in_township: {
    type: "noul",
    instructions:
      "Is this inside Plainsboro Township, NJ? Trust gis_in_township. West Windsor, Princeton, South Brunswick, or other cities are not Plainsboro.",
    criteria: {
      false: "outside Plainsboro Township",
      true: "inside Plainsboro Township",
    },
  },
  crew: {
    type: "choice",
    instructions: "Which Plainsboro crew should own this if the town takes it?",
    criteria: {
      roads: "potholes, pavement, lane damage, street surface",
      town_public_works: "signs, lights, trash, general public works",
      environment: "drains, flooding, debris, trees, pollution",
      accessibility: "sidewalks, curb ramps, blocked accessible paths",
      other: "unclear or not a town crew",
    },
  },
  next_action: {
    type: "choice",
    instructions:
      "What should the operator do with THIS report given current_status? Open means nobody has taken it yet. In Progress means a crew is already assigned — do not dispatch again. Resolved is already closed.",
    criteria: {
      dispatch:
        "ticket is Open, Plainsboro owns it, send a crew and move status to In Progress",
      follow_up:
        "ticket is already In Progress — check on the crew, do not re-dispatch or change status",
      request_info:
        "need a better photo or pin from the citizen; keep the current status",
      close_not_ours:
        "not Plainsboro — close and point them to the right town, even if it is In Progress",
      hold: "keep the current status and do not dispatch yet",
    },
  },
} as const;

/** @deprecated use REPORT_QUESTIONS */
export const DISPATCH_QUESTIONS = REPORT_QUESTIONS;
