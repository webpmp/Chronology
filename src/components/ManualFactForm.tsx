import React, { useState } from "react";
import { Plus, Check, Info, AlertCircle } from "lucide-react";
import { CATEGORIES, CategoryName } from "../types";

interface Props {
  onAddFact: (category: CategoryName, variable: string, value: string, context: string) => { success: boolean; error?: string; errorType?: "duplicate" | "validation" };
}

export const ManualFactForm: React.FC<Props> = ({ onAddFact }) => {
  const [category, setCategory] = useState<CategoryName>("Computing");
  const [variable, setVariable] = useState("");
  const [value, setValue] = useState("");
  const [context, setContext] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    variable?: boolean;
    value?: boolean;
    context?: boolean;
  }>({});

  const handleVariableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Automatically convert to uppercase and replace invalid characters with underscores
    let val = e.target.value.toUpperCase();
    val = val.replace(/[^A-Z0-9_]/g, "_");
    setVariable(val);
    if (validationErrors.variable) {
      setValidationErrors((prev) => ({ ...prev, variable: false }));
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (validationErrors.value) {
      setValidationErrors((prev) => ({ ...prev, value: false }));
    }
  };

  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContext(e.target.value);
    if (validationErrors.context) {
      setValidationErrors((prev) => ({ ...prev, context: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof validationErrors = {};
    let hasError = false;

    if (!variable.trim()) {
      errors.variable = true;
      hasError = true;
    }
    if (!value.trim()) {
      errors.value = true;
      hasError = true;
    }
    if (!context.trim()) {
      errors.context = true;
      hasError = true;
    }

    if (hasError) {
      setValidationErrors(errors);
      setErrorMsg("Incomplete data: Missing short title or details");
      return;
    }

    // Clean leading underscores or numbers if present
    let cleanedVar = variable.replace(/^[^A-Z]+/, "");
    if (!cleanedVar) {
      setValidationErrors({ variable: true });
      setErrorMsg("Incomplete data: Missing short title or details");
      return;
    }

    setErrorMsg(null);
    setValidationErrors({});
    const res = onAddFact(category, cleanedVar, value, context);
    if (res && !res.success) {
      setErrorMsg(res.error || "Failed to append fact.");
      return;
    }

    // Reset Form
    setVariable("");
    setValue("");
    setContext("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  return (
    <div className="bg-[#FDFCF8] border border-[#1A1A1A]/15 rounded-none overflow-hidden shadow-sm">
      {/* Clickable Toggle Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-6 py-4 bg-[#1A1A1A]/5 border-b border-[#1A1A1A]/15 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1A]/10 select-none"
      >
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#C2410C]" />
          <h3 className="font-serif text-lg font-bold italic text-[#1A1A1A]">Append Fact Manually</h3>
        </div>
        <span className="text-[10px] bg-white px-2.5 py-1 rounded-none border border-[#1A1A1A]/15 text-[#1A1A1A]/75 font-mono uppercase">
          {isExpanded ? "▲" : "▼"}
        </span>
      </div>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-[#C2410C]/5 border border-[#C2410C]/25 text-[#C2410C] p-3 text-xs flex items-center gap-2 font-mono uppercase tracking-wide font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#1A1A1A]/70 font-mono mb-1 uppercase font-semibold">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryName)}
                className="w-full bg-white border border-[#1A1A1A]/20 rounded-none px-2.5 py-1.5 text-xs text-[#1A1A1A]/85 focus:outline-none focus:border-[#C2410C]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] text-[#1A1A1A]/70 font-mono uppercase font-semibold flex items-center gap-1.5">
                  <span>Short Title</span>
                  <span className="group relative cursor-help inline-flex items-center">
                    <Info className="w-3 h-3 text-[#1A1A1A]/40 hover:text-[#C2410C] transition-colors" />
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-[#1A1A1A] text-[#FDFCF8] text-[9px] font-sans font-normal p-2 shadow-md text-center pointer-events-none z-20 normal-case border border-white/10 leading-normal">
                      Uppercase keys prevent formatting drift.
                    </span>
                  </span>
                </label>
                {validationErrors.variable && <span className="text-[9px] text-[#C2410C] font-mono font-bold">* REQUIRED</span>}
              </div>
              <input
                type="text"
                placeholder="e.g. RECORD_BREAKING_HEAT_2025"
                value={variable}
                onChange={handleVariableChange}
                className={`w-full bg-white border rounded-none px-2.5 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-mono placeholder-[#1A1A1A]/35 ${
                  validationErrors.variable ? "border-[#C2410C] bg-[#C2410C]/5" : "border-[#1A1A1A]/20"
                }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] text-[#1A1A1A]/70 font-mono uppercase font-semibold">Summary</label>
              {validationErrors.value && <span className="text-[9px] text-[#C2410C] font-mono font-bold">* REQUIRED</span>}
            </div>
            <input
              type="text"
              placeholder="e.g. 1.54 Billion Dollars, 15.3% Growth..."
              value={value}
              onChange={handleValueChange}
              className={`w-full bg-white border rounded-none px-2.5 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] placeholder-[#1A1A1A]/35 font-semibold ${
                validationErrors.value ? "border-[#C2410C] bg-[#C2410C]/5" : "border-[#1A1A1A]/20"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] text-[#1A1A1A]/70 font-mono uppercase font-semibold">Details</label>
              {validationErrors.context && <span className="text-[9px] text-[#C2410C] font-mono font-bold">* REQUIRED</span>}
            </div>
            <textarea
              placeholder="Detailed explanatory paragraphs containing verified factual details, background events, and historic milestones..."
              value={context}
              onChange={(e) => {
                handleContextChange(e);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              className={`w-full bg-[#FFFFFF] border rounded-none p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-sans resize-none overflow-hidden min-h-[88px] placeholder-[#1A1A1A]/35 ${
                validationErrors.context ? "border-[#C2410C] bg-[#C2410C]/5" : "border-[#1A1A1A]/20"
              }`}
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] font-bold px-5 py-2 rounded-none text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {submitted ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Appended!
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add Key Fact
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
