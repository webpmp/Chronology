import React, { useState, useEffect } from "react";
import {
  Database,
  Search,
  RefreshCw,
  FolderOpen,
  Folder,
  Trash2,
  Edit2,
  Check,
  X,
  FileCode,
  Flame,
  Layers,
  Sparkles,
  Info,
  Sliders,
  LogOut,
  RotateCcw
} from "lucide-react";
import { CATEGORIES, CategoryName, FactsDatabase, FactValue } from "./types";
import { CategoryIcon } from "./components/CategoryIcon";
import { AIResearchPanel } from "./components/AIResearchPanel";
import { JSONViewer } from "./components/JSONViewer";
import { ManualFactForm } from "./components/ManualFactForm";

export default function App() {
  const [sessionData, setSessionData] = useState<FactsDatabase>({});
  const [savedData, setSavedData] = useState<FactsDatabase>({});
  const [pendingDeletions, setPendingDeletions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "dirty" | "error">("synced");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamically compute unsaved items count by comparing sessionData against savedData and accounting for pendingDeletions
  const unsavedCount = Object.keys(sessionData).reduce((count, cat) => {
    const catFacts = sessionData[cat] || {};
    const savedCat = savedData[cat] || {};
    
    // Newly appended: in sessionData, but not in savedData, and NOT in pendingDeletions
    const newCount = Object.keys(catFacts).filter((v) => !savedCat[v] && !pendingDeletions[cat]?.[v]).length;
    
    // Marked for deletion: in savedData, and is in pendingDeletions
    const delCount = Object.keys(savedCat).filter((v) => pendingDeletions[cat]?.[v] && catFacts[v]).length;
    
    return count + newCount + delCount;
  }, 0);

  const isDirty = unsavedCount > 0;

  // Editing state for inline memory changes
  const [editingCard, setEditingCard] = useState<{
    category: string;
    oldVariable: string;
    newVariable: string;
    value: string;
    context: string;
  } | null>(null);

  // 1. Fetch initial facts from server
  const loadFacts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/facts");
      const data = await res.json();
      if (res.ok) {
        setSessionData(data);
        setSavedData(JSON.parse(JSON.stringify(data)));
        setPendingDeletions({});
        setSyncStatus("synced");
      } else {
        throw new Error(data.error || "Failed to load database");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to establish database linkage.");
      setSyncStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacts();
  }, []);

  // 2. Synchronize current facts state with backend JSON file (fully overwrites file)
  const saveFactsToServer = async (latestFacts: FactsDatabase) => {
    setSyncStatus("saving");
    try {
      const res = await fetch("/api/facts?overwrite=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latestFacts),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatus("synced");
      } else {
        throw new Error(data.error || "Write failure");
      }
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
    }
  };

  // 3. Add or update fact helper
  const handleAddFact = (category: CategoryName, variable: string, value: string, context: string): { success: boolean; error?: string; errorType?: "duplicate" | "validation" } => {
    const trimmedVar = (variable || "").trim();
    const trimmedVal = (value || "").trim();
    const trimmedCtx = (context || "").trim();

    if (!trimmedVar || !trimmedVal || !trimmedCtx) {
      return {
        success: false,
        error: "Incomplete data: Missing short title or details",
        errorType: "validation"
      };
    }

    const formattedVar = trimmedVar.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/^[^A-Z]+/, "");
    if (!formattedVar) {
      return {
        success: false,
        error: "Incomplete data: Missing short title or details",
        errorType: "validation"
      };
    }

    if (sessionData[category] && sessionData[category][formattedVar]) {
      return {
        success: false,
        error: `This short title already exists in the [${category}] archive.`,
        errorType: "duplicate"
      };
    }

    setSessionData((prev) => {
      const copy = { ...prev };
      if (!copy[category]) {
        copy[category] = {};
      }
      copy[category] = {
        ...copy[category],
        [formattedVar]: { value: trimmedVal, context: trimmedCtx }
      };
      return copy;
    });

    // Make sure the category containing the new fact is expanded
    if (!expandedCategories.includes(category)) {
      setExpandedCategories((prev) => [...prev, category]);
    }

    return { success: true };
  };

  // 4. Delete fact helper (session only, pending-deletion marker)
  const handleDeleteFact = (category: string, variable: string) => {
    setPendingDeletions((prev) => {
      const copy = { ...prev };
      if (!copy[category]) {
        copy[category] = {};
      }
      copy[category] = {
        ...copy[category],
        [variable]: true
      };
      return copy;
    });
  };

  const handleUndoDeleteFact = (category: string, variable: string) => {
    setPendingDeletions((prev) => {
      const copy = { ...prev };
      if (copy[category]) {
        const catCopy = { ...copy[category] };
        delete catCopy[variable];
        copy[category] = catCopy;
      }
      return copy;
    });
  };

  // 5. Handle Import JSON with deep merging to avoid replacing existing records
  const handleImportJSON = (imported: FactsDatabase) => {
    setSessionData((prev) => {
      const copy = { ...prev };
      
      // Iterate over each category in the imported JSON
      Object.keys(imported).forEach((category) => {
        // Soft match category to standard list
        const matchedCategory = CATEGORIES.find(
          (c) => c.toLowerCase() === category.toLowerCase()
        ) || category;
        
        const uppercaseCat = matchedCategory as CategoryName;

        if (!copy[uppercaseCat]) {
          copy[uppercaseCat] = {};
        }

        const importedCatData = imported[category];
        if (importedCatData && typeof importedCatData === "object") {
          Object.keys(importedCatData).forEach((variable) => {
            const formattedVar = variable.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/^[^A-Z]+/, "");
            if (!formattedVar) return; // skip if invalid variable name
            
            const item = importedCatData[variable];
            if (item && typeof item === "object") {
              copy[uppercaseCat][formattedVar] = {
                value: item.value || "",
                context: item.context || ""
              };
            }
          });
        }
      });
      
      return copy;
    });
  };

  // 6. Reset dataset to initial high-fidelity seed
  const handleResetToSeed = async () => {
    try {
      setSyncStatus("saving");
      const res = await fetch("/api/facts/reset", {
        method: "POST"
      });
      if (res.ok) {
        setSyncStatus("synced");
        // Just reload to get initial seeds
        loadFacts();
      } else {
        throw new Error("Reset failed");
      }
    } catch (err) {
      setSyncStatus("error");
    }
  };

  const handleClearDataset = async () => {
    // Clear dataset locally
    setSessionData({});
    setPendingDeletions({});
  };

  const handleSaveData = async () => {
    try {
      setSyncStatus("saving");
      
      // Clean up sessionData by permanently removing any key marked as pending-deletion
      const cleanData = JSON.parse(JSON.stringify(sessionData));
      Object.keys(pendingDeletions).forEach((cat) => {
        Object.keys(pendingDeletions[cat] || {}).forEach((v) => {
          if (pendingDeletions[cat][v]) {
            if (cleanData[cat]) {
              delete cleanData[cat][v];
              if (Object.keys(cleanData[cat]).length === 0) {
                delete cleanData[cat];
              }
            }
          }
        });
      });

      const res = await fetch("/api/facts/save-as-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanData),
      });
      if (res.ok) {
        setSyncStatus("synced");
        setPendingDeletions({});
        // Synchronize savedData and sessionData with cleanData to clear all alerts and highlights
        setSessionData(cleanData);
        setSavedData(JSON.parse(JSON.stringify(cleanData)));
      } else {
        throw new Error("Save seed failed");
      }
    } catch (err) {
      setSyncStatus("error");
    }
  };

  // 7. Toggle category expand/collapse
  const toggleCategory = (cat: string) => {
    if (expandedCategories.includes(cat)) {
      setExpandedCategories((prev) => prev.filter((c) => c !== cat));
    } else {
      setExpandedCategories((prev) => [...prev, cat]);
    }
  };

  // 8. Start editing inline
  const startEditAction = (category: string, variable: string, details: FactValue) => {
    setEditingCard({
      category,
      oldVariable: variable,
      newVariable: variable,
      value: details.value,
      context: details.context
    });
  };

  // 9. Save edited draft
  const saveCardEdit = () => {
    if (!editingCard) return;
    const { category, oldVariable, newVariable, value, context } = editingCard;

    if (!newVariable.trim() || !value.trim() || !context.trim()) {
      alert("Please ensure none of the fields are blank.");
      return;
    }

    const formattedVar = newVariable.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

    setSessionData((prev) => {
      const copy = { ...prev };
      if (!copy[category]) copy[category] = {};

      // If variable name changed, delete old key
      if (oldVariable !== formattedVar) {
        delete copy[category][oldVariable];
      }

      copy[category][formattedVar] = { value, context };
      return copy;
    });

    setEditingCard(null);
  };

  // Extract all existing variable identifiers flat for duplicate searches
  const existingVariables = Object.values(sessionData).flatMap((catData) =>
    Object.keys(catData || {})
  );

  return (
    <div className="font-sans h-screen w-screen overflow-hidden bg-[#FDFCF8] text-[#1A1A1A] flex flex-col selection:bg-[#C2410C]/20">
      
      {/* Editorial Header (Full-width spanning at the very top) */}
      <header className="border-b-4 border-[#1A1A1A] w-full px-6 pt-4 pb-4 flex-shrink-0 bg-[#FDFCF8] z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
            <div className="flex flex-col">
              <h1 className="font-serif text-5xl md:text-6xl font-bold italic tracking-tight text-[#1A1A1A] leading-none">
                Chronology
              </h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-xs border-t border-[#1A1A1A]/10 mt-3 pt-2.5 gap-2">
            <p className="uppercase tracking-widest text-[10px] sm:text-[11px] font-bold text-[#1A1A1A]/70 flex items-center gap-2">
              <span>Significant Global Events & Scientific Breakthroughs Reference Archive</span>
            </p>
            <div className="font-mono text-[11px] opacity-65">
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Split Row */}
      <div className="flex-1 flex flex-row overflow-hidden w-full max-w-7xl mx-auto bg-[#FDFCF8]">
        
        {/* Left Data Column: Scrollable Curated Memory Visualizer */}
        <main className="left-data-column flex-1 min-w-0 h-full overflow-y-auto p-6 space-y-6 flex flex-col">
          
          {/* Controls: Search bar with custom styling */}
          <div className="border border-[#1A1A1A]/15 bg-[#FDFCF8] p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <form onSubmit={(e) => e.preventDefault()} className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-[#1A1A1A]/60" />
              </span>
              <input
                type="text"
                placeholder="Filter by title, summary, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-[#1A1A1A]/20 rounded-none pl-9 pr-12 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] placeholder-[#1A1A1A]/35 font-sans"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-[#C2410C] hover:opacity-80"
                >
                  Clear
                </button>
              )}
            </form>

            <div className="text-[11px] font-mono text-[#1A1A1A]/70 flex items-center gap-3">
              <span className="flex items-center gap-1">
                Categories: <strong className="text-[#1A1A1A]">{CATEGORIES.length}</strong>
              </span>
              <span className="text-[#1A1A1A]/30">|</span>
              <span className="flex items-center gap-1">
                Facts: <strong className="text-[#C2410C]">{existingVariables.length}</strong>
              </span>
            </div>
          </div>

          {/* Categories Accordions & Card Nodes */}
          <div className="flex-grow space-y-4">
            {loading ? (
              <div className="h-60 border border-[#1A1A1A]/15 bg-[#F4F1E6]/40 rounded-sm flex flex-col items-center justify-center space-y-3 text-center">
                <RefreshCw className="w-6 h-6 text-[#1A1A1A] animate-spin" />
                <span className="text-xs font-mono uppercase tracking-widest text-[#1A1A1A]/60">SYNCHRONIZING REPOSITORY GRAPH...</span>
              </div>
            ) : (
              CATEGORIES.map((category) => {
                const categoryFacts = sessionData[category] || {};
                const variables = Object.keys(categoryFacts).reverse();
                
                // Filtering variables and values matching search string
                const filteredVars = variables.filter((v) => {
                  if (!searchTerm) return true;
                  const item = categoryFacts[v];
                  const term = searchTerm.toLowerCase();
                  return (
                    v.toLowerCase().includes(term) ||
                    item.value.toLowerCase().includes(term) ||
                    item.context.toLowerCase().includes(term)
                  );
                });

                if (searchTerm && filteredVars.length === 0) {
                  return null; // Hide categories without matches during search
                }

                const isExpanded = expandedCategories.includes(category);
                const isEditingThisCategory = editingCard?.category === category;

                return (
                  <div
                    key={category}
                    className="border-b border-[#1A1A1A]/15 pb-2 last:border-0"
                  >
                    {/* Accordion Trigger */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full py-3.5 flex items-center justify-between text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1 px-2 border border-[#1A1A1A]/15 bg-[#1A1A1A]/5 text-[#C2410C]">
                          <CategoryIcon category={category} className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-serif text-xl font-bold italic text-[#1A1A1A] group-hover:text-[#C2410C] transition-colors">{category}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[#1A1A1A]/50 bg-[#1A1A1A]/5 px-2 py-0.5 border border-[#1A1A1A]/10">
                          {variables.length} entries
                        </span>
                        {filteredVars.length !== variables.length && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#C2410C] text-[#FDFCF8] rounded-none font-mono">
                            {filteredVars.length} match
                          </span>
                        )}
                        <span className="text-[#1A1A1A]/50 text-xs">
                          {isExpanded ? <FolderOpen className="w-4 h-4 text-[#C2410C]" /> : <Folder className="w-4 h-4" />}
                        </span>
                      </div>
                    </button>

                    {/* Accordion Body */}
                    {isExpanded && (
                      <div className="pl-4 pr-1 pb-4 pt-2 space-y-4">
                        {variables.length === 0 ? (
                           <p className="text-xs text-[#1A1A1A]/50 italic py-2">No training variables enrolled under this category.</p>
                        ) : filteredVars.length === 0 ? (
                           <p className="text-xs text-[#1A1A1A]/50 italic py-2">No entries match current query.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {filteredVars.map((v) => {
                              const item = categoryFacts[v];
                              const isEditingThisCard = editingCard && editingCard.oldVariable === v && isEditingThisCategory;

                              if (isEditingThisCard && editingCard) {
                                return (
                                  <form
                                    key={v}
                                    onSubmit={(e) => { e.preventDefault(); saveCardEdit(); }}
                                    className="p-5 border-2 border-[#1A1A1A] bg-[#f4f3ed] space-y-4"
                                  >
                                    <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                                      <span className="text-[10px] font-mono text-[#C2410C] font-bold tracking-wider">EDIT VARIABLE CONFIG</span>
                                      <button
                                        onClick={() => setEditingCard(null)}
                                        className="p-1 hover:bg-[#1A1A1A]/10 rounded text-[#1A1A1A]/70"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-[10px] text-[#1A1A1A]/75 font-mono mb-1 uppercase font-bold">Variable Name (uppercase snake_case)</label>
                                        <input
                                          type="text"
                                          value={editingCard.newVariable}
                                          onChange={(e) => setEditingCard({ ...editingCard, newVariable: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })}
                                          className="w-full bg-[#text-slate-100] bg-white border border-[#1A1A1A]/20 rounded-none px-2.5 py-1.5 text-xs text-[#1A1A1A] font-mono focus:outline-none focus:border-[#C2410C]"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] text-[#1A1A1A]/75 font-mono mb-1 uppercase font-bold">Verified Fact / Metric Status</label>
                                        <input
                                          type="text"
                                          value={editingCard.value}
                                          onChange={(e) => setEditingCard({ ...editingCard, value: e.target.value })}
                                          className="w-full bg-white border border-[#1A1A1A]/20 rounded-none px-2.5 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-semibold"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] text-[#1A1A1A]/75 font-mono mb-1 uppercase font-bold">Context Chronicles</label>
                                        <textarea
                                          rows={2}
                                          value={editingCard.context}
                                          onChange={(e) => setEditingCard({ ...editingCard, context: e.target.value })}
                                          className="w-full bg-white border border-[#1A1A1A]/20 rounded-none p-2.5 text-xs text-[#1A1A1A] font-sans resize-none focus:outline-none focus:border-[#C2410C]"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex justify-end gap-2 text-xs pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingCard(null)}
                                        className="border border-[#1A1A1A]/30 px-3 py-1.5 text-[10px] uppercase font-bold hover:bg-[#1A1A1A]/10"
                                      >
                                        Discard
                                      </button>
                                      <button
                                        type="submit"
                                        className="bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] px-4 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </form>
                                );
                              }

                              const isUnsaved = !savedData[category]?.[v];
                              const isPendingDelete = !!pendingDeletions[category]?.[v];

                              return (
                                <div
                                  key={v}
                                  id={`entry-${v}`}
                                  className={`pending-save p-5 border border-[#1A1A1A]/15 transition-all flex flex-col justify-between ${
                                    isPendingDelete
                                      ? "bg-red-50/40 border-l-[3px] border-red-500 hover:border-[#1A1A1A]/30 hover:border-l-red-500 shadow-sm opacity-60"
                                      : isUnsaved
                                      ? "bg-[#f0f9ff]/75 border-l-[3px] border-[#0284c7] hover:border-[#1A1A1A]/30 hover:border-l-[#0284c7] shadow-sm"
                                      : "bg-[#FDFCF8] hover:border-[#1A1A1A]/30"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-4 mb-2 pb-2 border-b border-[#1A1A1A]/5">
                                      <div className="flex flex-wrap items-center gap-2 max-w-[calc(100%-48px)]">
                                        <code className={`text-[10px] text-[#C2410C] font-mono tracking-tight font-bold bg-[#C2410C]/5 border border-[#C2410C]/15 px-2 py-0.5 rounded-none shrink-0 ${
                                          isPendingDelete ? "line-through text-red-650 bg-red-100/10 border-red-500/15" : ""
                                        }`}>
                                          {v}
                                        </code>
                                        {isPendingDelete && (
                                          <span className="text-[8px] font-mono font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-[3px] border border-red-500/15 shrink-0 tracking-wider">
                                            DELETING
                                          </span>
                                        )}
                                        {isUnsaved && !isPendingDelete && (
                                          <span className="text-[8px] font-mono font-black bg-[#e0f2fe] text-[#0369a1] px-1.5 py-0.5 rounded-[3px] border border-[#0369a1]/15 shrink-0 tracking-wider">
                                            UNSAVED
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {!isPendingDelete && (
                                          <button
                                            onClick={() => startEditAction(category, v, item)}
                                            className="p-1 hover:bg-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:text-[#1A1A1A] rounded-none transition"
                                            title="Edit memory card"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {isPendingDelete ? (
                                          <button
                                            onClick={() => handleUndoDeleteFact(category, v)}
                                            className="p-1 hover:bg-orange-100 text-orange-655 rounded-none transition"
                                            title="Undo pending deletion"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleDeleteFact(category, v)}
                                            className="p-1 hover:bg-[#C2410C]/10 text-[#1A1A1A]/40 hover:text-[#C2410C] rounded-none transition"
                                            title="Deletes fact from dataset"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <h4 className="font-serif italic text-2xl font-light text-[#1A1A1A] mb-2 leading-tight">
                                      {item.value}
                                    </h4>
                                    
                                    <p className="text-xs text-[#1A1A1A]/75 leading-relaxed font-sans">
                                      {item.context}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* Right Control Sidebar: Fixed Width & Independently Scrollable */}
        <aside className="w-[484px] h-full overflow-y-auto bg-[#FDFCF8] border-l border-[#1A1A1A]/10 p-6 space-y-8 flex-shrink-0">
          <JSONViewer
            data={sessionData}
            savedData={savedData}
            pendingDeletions={pendingDeletions}
            onImportJSON={handleImportJSON}
            onClearDataset={handleClearDataset}
            onResetToSeed={handleResetToSeed}
            onSaveData={handleSaveData}
            isDirty={isDirty}
            unsavedCount={unsavedCount}
          />

          <AIResearchPanel onAddFact={handleAddFact} existingVariables={existingVariables} />

          {/* Add Manual Fact Form */}
          <ManualFactForm onAddFact={handleAddFact} />
        </aside>

      </div>

      {/* Editorial Footer (Full-width spanning at the very bottom) */}
      <footer className="app-footer border-t-2 border-[#1A1A1A] w-full px-6 py-6 flex-shrink-0 bg-[#FDFCF8] z-10">
        <div className="max-w-7xl mx-auto footer-content flex flex-col md:flex-row items-center justify-between text-[11px] font-mono text-[#1A1A1A]/60 uppercase tracking-wider gap-4">
          <p className="copyright">
            &copy; 2026 Chronology Reference Archive by Chris Adkins
          </p>
          <p className="licensing">
            Software licensed under the{" "}
            <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="text-[#C2410C] hover:underline">MIT License</a>.{" "}
            Data archives licensed under{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-[#C2410C] hover:underline">CC BY 4.0</a>.
          </p>
        </div>
      </footer>

    </div>
  );
}
