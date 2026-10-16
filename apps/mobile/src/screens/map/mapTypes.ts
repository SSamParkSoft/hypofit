import type { InterviewMode, InterviewPost } from "@hypofit/contracts";

export type MapModeFilter = "all" | Extract<InterviewMode, "offline" | "both">;

export type LocationState = "checking" | "requesting" | "granted" | "denied" | "unavailable";

export type PostingWithCoordinates = InterviewPost & { location_latitude: number; location_longitude: number };

export type MapMarkerItem =
  | {
      id: string;
      latitude: number;
      longitude: number;
      post: PostingWithCoordinates;
      type: "single";
    }
  | {
      id: string;
      latitude: number;
      longitude: number;
      posts: PostingWithCoordinates[];
      type: "group";
    };
