import React, { useState } from "react";
import {
  Code,
  Copy,
  Download,
  Upload,
  Check,
  AlertCircle,
  TrendingDown,
  Activity,
  Award,
  Database,
  Trash2,
  RefreshCw
} from "lucide-react";
import { FactsDatabase } from "../types";

interface Props {
  data: FactsDatabase;
  savedData?: FactsDatabase;
  pendingDeletions?: Record<string, Record<string, boolean>>;
  onImportJSON: (imported: FactsDatabase) => void;
  onClearDataset?: () => void;
  onResetToSeed?: () => void;
  onSaveData?: () => void;
  isDirty?: boolean;
  unsavedCount?: number;
}

export const JSONViewer: React.FC<Props> = ({
  data,
  savedData,
  pendingDeletions = {},
  onImportJSON,
  onClearDataset,
  onResetToSeed,
  onSaveData,
  isDirty = false,
  unsavedCount = 0
}) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImportArea, setShowImportArea] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<"clear" | "reset" | "save" | null>(null);
  const [isSaveHovered, setIsSaveHovered] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  // Compute Metrics
  let totalCategories = Object.keys(data).length;
  let totalVariables = 0;
  let avgContextChars = 0;
  let totalCharSum = 0;

  Object.values(data).forEach((catData) => {
    if (catData && typeof catData === "object") {
      const vars = Object.keys(catData);
      totalVariables += vars.length;
      vars.forEach((v) => {
        totalCharSum += catData[v]?.context?.length || 0;
      });
    }
  });

  if (totalVariables > 0) {
    avgContextChars = Math.round(totalCharSum / totalVariables);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dateStr}_key_facts.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    try {
      setImportError(null);
      if (!importText.trim()) {
        setImportError("Please paste a JSON block first.");
        return;
      }
      const parsed = JSON.parse(importText);
      if (typeof parsed !== "object" || parsed === null) {
        setImportError("JSON must be a valid object.");
        return;
      }

      // Verify at least one valid object state
      onImportJSON(parsed);
      setImportText("");
      setShowImportArea(false);
      alert("JSON facts successfully loaded.");
    } catch (e: any) {
      setImportError(`Syntax Error: ${e.message}`);
    }
  };

  return (
    <div id="json-viewer-card" className="bg-[#FDFCF8] border border-[#1A1A1A]/15 rounded-none overflow-hidden shadow-sm">
      {/* Stats Board */}
      <div className="px-6 py-4 bg-[#1A1A1A]/5 grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-none border border-[#1A1A1A]/10 text-center">
          <span className="text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider font-mono block">Categories</span>
          <span className="text-xl font-bold text-[#1A1A1A] mt-0.5 block">{totalCategories}</span>
        </div>
        <div className="bg-white p-3 rounded-none border border-[#1A1A1A]/10 text-center">
          <span className="text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider font-mono block">Facts</span>
          <span className="text-xl font-bold text-[#C2410C] mt-0.5 block">{totalVariables}</span>
        </div>
        {unsavedCount > 0 ? (
          <button
            onClick={() => onSaveData?.()}
            className="bg-[#FFFBEB] p-3 rounded-none border border-[#F59E0B]/30 text-center hover:bg-[#FEF3C7] hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0 active:shadow-none transition-all cursor-pointer block focus:outline-none focus:border-[#F59E0B] w-full"
            title="Click to immediately save unsaved changes"
          >
            <span className="text-[10px] text-[#D97706] uppercase tracking-wider font-mono font-bold block">UNSAVED CHANGES</span>
            <span className="text-xl font-extrabold text-[#D97706] mt-0.5 block">+{unsavedCount} new</span>
          </button>
        ) : (
          <div className="bg-white p-3 rounded-none border border-[#1A1A1A]/10 text-center w-full">
            <span className="text-[10px] text-[#1A1A1A]/60 uppercase tracking-wider font-mono block">STATUS</span>
            <span className="text-xl font-bold text-[#10B981] mt-0.5 block">
              SYNCED
            </span>
          </div>
        )}
      </div>

      {/* Action Header */}
      <div className="px-6 py-3 bg-[#1A1A1A]/5 border-t border-[#1A1A1A]/15 flex items-center justify-between">
        <span className="text-xs font-mono text-[#1A1A1A]/80 flex items-center gap-1.5 font-bold uppercase tracking-wider">
          <Code className="w-3.5 h-3.5 text-[#C2410C]" />
          DATASET
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-[#1A1A1A]/5 rounded-none text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition cursor-pointer"
            title="Copy JSON block to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-[#1A1A1A]/5 rounded-none text-[#1A1A1A]/60 hover:text-[#1A1A1A] transition cursor-pointer"
            title="Download JSON dataset file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (!isExpanded) {
                setIsExpanded(true);
              }
              setShowImportArea(!showImportArea);
            }}
            className={`p-1.5 rounded-none transition cursor-pointer ${
              showImportArea && isExpanded
                ? "bg-[#C2410C]/10 text-[#C2410C] border border-[#C2410C]/20"
                : "hover:bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
            }`}
            title="Import/Update existing facts"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] bg-white hover:bg-[#1A1A1A]/5 px-2.5 py-[5px] rounded-none border border-[#1A1A1A]/15 text-[#1A1A1A]/75 font-mono uppercase cursor-pointer flex items-center justify-center transition-colors"
            title={isExpanded ? "Collapse JSON Dataset" : "Expand JSON Dataset"}
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-4 border-t border-[#1A1A1A]/15">
            {/* Import Module */}
            {showImportArea && (
              <div className="bg-[#f4f3ed] border border-[#1A1A1A]/15 p-4 rounded-none space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A1A1A]/80 uppercase tracking-wider font-mono">Paste Curated JSON Block</span>
                  <button
                    onClick={() => setShowImportArea(false)}
                    className="text-xs text-[#C2410C] hover:opacity-80"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  rows={5}
                  placeholder='{ "Computing": { "VARIABLE": { "value": "Val", "context": "explanatory text" } } }'
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full bg-white border border-[#1A1A1A]/20 rounded-none p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-mono"
                />
                {importError && (
                  <div className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-650" />
                    <span>{importError}</span>
                  </div>
                )}
                <button
                  onClick={handleImportSubmit}
                  className="w-full bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Parse and Merge Dataset
                </button>
              </div>
            )}

            {/* Code Viewbox */}
            {(() => {
              const jsonLines = jsonString.split("\n");
              
              let currentCategory = "";
              let currentVariable = "";
              const highlightedLines = jsonLines.map((line) => {
                const leadingSpaces = line.search(/\S/);
                if (leadingSpaces === -1) {
                  return null;
                }
                
                const categoryMatch = line.match(/^\s{2}"([^"]+)":\s*\{\s*,?$/);
                const variableMatch = line.match(/^\s{4}"([^"]+)":\s*\{\s*,?$/);
                const variableCloseMatch = line.match(/^\s{4}\},?\s*$/);
                
                if (leadingSpaces === 2) {
                  if (categoryMatch) {
                    currentCategory = categoryMatch[1];
                    currentVariable = "";
                  } else {
                    currentCategory = "";
                    currentVariable = "";
                  }
                } else if (leadingSpaces === 4) {
                  if (variableMatch) {
                    currentVariable = variableMatch[1];
                  }
                } else if (leadingSpaces < 2) {
                  currentCategory = "";
                  currentVariable = "";
                }
                
                let highlightType: "unsaved" | "deleting" | null = null;
                if (currentCategory && currentVariable) {
                  if (pendingDeletions?.[currentCategory]?.[currentVariable]) {
                    highlightType = "deleting";
                  } else {
                    const isVarUnsaved = savedData ? !savedData[currentCategory]?.[currentVariable] : false;
                    if (isVarUnsaved) {
                      highlightType = "unsaved";
                    }
                  }
                }

                // Handle closing brace of a variable block
                if (leadingSpaces === 4 && variableCloseMatch) {
                  currentVariable = "";
                }
                
                return highlightType;
              });

              return (
                <div className="relative bg-[#1A1A1A] border border-[#1A1A1A] rounded-none overflow-hidden font-mono text-xs">
                  <div className="absolute right-3 top-3 text-[9px] select-none px-2 py-0.5 bg-black text-[#FDFCF8]/40 rounded-none uppercase z-10 font-bold">
                    json
                  </div>
                  <div className="overflow-x-auto max-h-[460px] py-4 bg-[#141414] text-[#f0f6fc]">
                    <div className="min-w-max">
                      {jsonLines.map((line, idx) => {
                        const hType = highlightedLines[idx];
                        const isHighlighted = !!hType;
                        let bgColor = "transparent";
                        if (hType === "unsaved") {
                          bgColor = "rgba(34, 197, 94, 0.15)";
                        } else if (hType === "deleting") {
                          bgColor = "rgba(239, 68, 68, 0.15)";
                        }

                        return (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: bgColor
                            }}
                            className={`flex items-stretch w-full transition-colors ${
                              isHighlighted
                                ? ""
                                : "hover:bg-white/[0.04]"
                            }`}
                          >
                            <div
                              className={`w-12 select-none pr-3 text-right text-[10px] font-mono border-r transition-colors flex items-center justify-end flex-shrink-0 ${
                                hType === "unsaved"
                                  ? "text-emerald-400 bg-emerald-950/30 border-emerald-500/30 font-bold"
                                  : hType === "deleting"
                                  ? "text-rose-400 bg-rose-950/35 border-rose-500/30 font-bold"
                                  : "text-neutral-600 border-neutral-800 bg-black/15"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div
                              className={`pl-4 pr-6 py-0.5 whitespace-pre font-mono text-xs leading-relaxed flex-grow transition-colors relative ${
                                hType === "unsaved"
                                  ? "border-l-2 border-emerald-500"
                                  : hType === "deleting"
                                  ? "border-l-2 border-red-500"
                                  : ""
                              }`}
                            >
                              {formatJsonLine(line)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

             {/* Action Buttons: Save, Clear, Reset */}
            <div className="flex flex-wrap gap-2.5 items-center pt-1">
              {onSaveData && (
                <button
                  type="button"
                  onClick={() => setConfirmingAction("save")}
                  className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans h-[32px] flex-shrink-0 border ${
                    isDirty
                      ? "bg-[#C2410C] text-[#FDFCF8] border-[#C2410C] hover:bg-[#A13106] hover:border-[#A13106] shadow-sm font-semibold active:scale-[0.98]"
                      : "bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/10 border-[#1A1A1A]/20"
                  }`}
                  title="Overwrite server seed_facts.json with current active JSON data"
                >
                  <Database className={`w-3.5 h-3.5 ${isDirty ? "text-[#FDFCF8]" : "text-[#C2410C]"}`} />
                  Save Data
                </button>
              )}

              {onResetToSeed && (
                <button
                  type="button"
                  onClick={() => setConfirmingAction("reset")}
                  className="px-4 py-1.5 bg-white text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FDFCF8] border border-[#1A1A1A]/25 hover:border-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans h-[32px] flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Data
                </button>
              )}

              {onClearDataset && (
                <button
                  type="button"
                  onClick={() => setConfirmingAction("clear")}
                  className="px-4 py-1.5 bg-rose-50 text-[#C2410C] hover:bg-[#C2410C] hover:text-[#FDFCF8] border border-[#C2410C]/20 hover:border-[#C2410C] text-[10px] font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans h-[32px] flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Data
                </button>
              )}
            </div>

            {/* Confirmation Banner */}
            {confirmingAction && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-none space-y-3 font-sans transition-all animate-fade-in">
                <div className="text-xs text-amber-900 font-medium">
                  {confirmingAction === "clear" && (
                    <span>Are you sure you want to <strong>completely clear</strong> the active dataset? This will remove all facts and categories.</span>
                  )}
                  {confirmingAction === "reset" && (
                    <span>Are you sure you want to <strong>reset</strong> the dataset to the default seed facts? All active manual updates will be overwritten.</span>
                  )}
                  {confirmingAction === "save" && (
                    <span>Are you sure you want to <strong>save the current active JSON</strong> as the default seed data? This will overwrite original seed facts.</span>
                  )}
                </div>
                <div className="flex gap-2 text-[10px] uppercase tracking-wider font-bold">
                  <button
                    onClick={() => {
                      if (confirmingAction === "clear") {
                        onClearDataset?.();
                      } else if (confirmingAction === "reset") {
                        onResetToSeed?.();
                      } else if (confirmingAction === "save") {
                        onSaveData?.();
                      }
                      setConfirmingAction(null);
                    }}
                    className="px-4 py-1.5 bg-[#C2410C] text-white hover:bg-red-800 transition cursor-pointer"
                  >
                    Confirm Action
                  </button>
                  <button
                    onClick={() => setConfirmingAction(null)}
                    className="px-4 py-1.5 bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/10 border border-[#1A1A1A]/15 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}


          </div>
      )}
    </div>
  );
};

function formatJsonLine(line: string) {
  return <span className="text-[#FDFCF8]/90">{line}</span>;
}
