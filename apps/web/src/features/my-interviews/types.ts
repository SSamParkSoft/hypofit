import type { ApplicationReadModel } from "../workflow/readModels";

export type MyInterviewTab = "applications" | "posts";

export interface MyInterviewsTabMeta {
  count: number;
  description: string;
  label: string;
  value: MyInterviewTab;
}

export type MyInterviewApplicationRowModel = ApplicationReadModel;
