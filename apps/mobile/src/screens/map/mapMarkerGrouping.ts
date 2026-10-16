import type { InterviewPost } from "@hypofit/contracts";
import type { MapMarkerItem, PostingWithCoordinates } from "./mapTypes";

export function buildMapMarkerItems(posts: PostingWithCoordinates[]): MapMarkerItem[] {
  const groups = new Map<
    string,
    {
      latitude: number;
      longitude: number;
      posts: PostingWithCoordinates[];
    }
  >();

  for (const post of posts) {
    const key = getCoordinateGroupKey(post.location_latitude, post.location_longitude);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.posts.push(post);
      continue;
    }

    groups.set(key, {
      latitude: post.location_latitude,
      longitude: post.location_longitude,
      posts: [post],
    });
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    if (group.posts.length === 1) {
      const [post] = group.posts;

      return {
        id: post.id,
        latitude: group.latitude,
        longitude: group.longitude,
        post,
        type: "single",
      };
    }

    return {
      id: `group:${key}`,
      latitude: group.latitude,
      longitude: group.longitude,
      posts: group.posts,
      type: "group",
    };
  });
}

function getCoordinateGroupKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
}

export function hasMapCoordinates(
  post: InterviewPost,
): post is InterviewPost & { location_latitude: number; location_longitude: number } {
  return (
    typeof post.location_latitude === "number" &&
    Number.isFinite(post.location_latitude) &&
    typeof post.location_longitude === "number" &&
    Number.isFinite(post.location_longitude)
  );
}

export function isRenderableMapPost(post: InterviewPost): post is PostingWithCoordinates {
  return post.interview_mode !== "online" && hasMapCoordinates(post);
}
