import React from "react";
import {
  Cpu,
  Tv,
  TrendingUp,
  GraduationCap,
  Leaf,
  Globe,
  Heart,
  Building2,
  Scale,
  Landmark,
  Atom,
  Trophy,
  Rocket,
  HelpCircle
} from "lucide-react";
import { CategoryName } from "../types";

interface Props {
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<Props> = ({ category, className = "w-5 h-5" }) => {
  switch (category as CategoryName | string) {
    case "Computing":
      return <Cpu className={className} />;
    case "Culture":
      return <Tv className={className} />;
    case "Economic Metrics":
      return <TrendingUp className={className} />;
    case "Education":
      return <GraduationCap className={className} />;
    case "Environment & Climate":
      return <Leaf className={className} />;
    case "Global Affairs":
      return <Globe className={className} />;
    case "Health & Medicine":
      return <Heart className={className} />;
    case "Infrastructure & Urban Development":
      return <Building2 className={className} />;
    case "Law & Policy":
      return <Scale className={className} />;
    case "Politics":
      return <Landmark className={className} />;
    case "Science":
      return <Atom className={className} />;
    case "Sports":
      return <Trophy className={className} />;
    case "Transportation":
      return <Rocket className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};
