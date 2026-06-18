export interface FactValue {
  value: string;
  context: string;
}

export type CategoryName =
  | "Computing"
  | "Culture"
  | "Economic Metrics"
  | "Education"
  | "Environment & Climate"
  | "Global Affairs"
  | "Health & Medicine"
  | "Infrastructure & Urban Development"
  | "Law & Policy"
  | "Politics"
  | "Science"
  | "Sports"
  | "Transportation";

export const CATEGORIES: CategoryName[] = [
  "Computing",
  "Culture",
  "Economic Metrics",
  "Education",
  "Environment & Climate",
  "Global Affairs",
  "Health & Medicine",
  "Infrastructure & Urban Development",
  "Law & Policy",
  "Politics",
  "Science",
  "Sports",
  "Transportation"
];

export interface FactsDatabase {
  [category: string]: {
    [variable: string]: FactValue;
  };
}

export interface ExtractedFact {
  category: CategoryName;
  variable: string;
  value: string;
  context: string;
}
