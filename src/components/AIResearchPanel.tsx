import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  Globe,
  Settings,
  Flame,
  Plus,
  Check,
  AlertTriangle,
  FileText,
  BookmarkCheck,
  RotateCw,
  Info
} from "lucide-react";
import { CATEGORIES, CategoryName, ExtractedFact } from "../types";

interface Props {
  onAddFact: (category: CategoryName, variable: string, value: string, context: string) => { success: boolean; error?: string; errorType?: "duplicate" | "validation" };
  existingVariables: string[];
}

type TabType = "grounding" | "newsapi" | "newsdata" | "text";

export const AIResearchPanel: React.FC<Props> = ({ onAddFact, existingVariables }) => {
  const [activeTab, setActiveTab] = useState<TabType>("newsapi");
  const [topicQuery, setTopicQuery] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setProgress(5);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) {
            return prev + Math.floor(Math.random() * 5) + 5; // Start fast
          } else if (prev < 75) {
            return prev + Math.floor(Math.random() * 3) + 2; // Maintain steady pace
          } else if (prev < 90) {
            return prev + Math.floor(Math.random() * 2) + 1; // Creep up slowly
          } else if (prev < 97) {
            return prev + 0.3; // Stalling increments until loaded
          } else {
            return prev;
          }
        });
      }, 150);
    } else {
      setProgress(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [loading]);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Drafted facts returned by the AI extraction endpoint
  const [draftFacts, setDraftFacts] = useState<ExtractedFact[]>([]);
  const [addedDraftIndices, setAddedDraftIndices] = useState<number[]>([]);
  const [draftErrors, setDraftErrors] = useState<{ [index: number]: string }>({});

  // Selected Model State
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("ai_selected_model") || "gemini-3.5-flash";
  });

  // LM Studio Config States
  const [lmStudioEnabled, setLmStudioEnabled] = useState<boolean>(() => {
    const activeModel = localStorage.getItem("ai_selected_model") || "gemini-3.5-flash";
    return activeModel === "lmstudio";
  });
  const [lmStudioUrl, setLmStudioUrl] = useState<string>(() => {
    return localStorage.getItem("lm_studio_url") || "http://localhost:1234/v1";
  });
  const [lmStudioModel, setLmStudioModel] = useState<string>(() => {
    return localStorage.getItem("lm_studio_model") || "";
  });
  const [lmStudioToken, setLmStudioToken] = useState<string>(() => {
    return localStorage.getItem("lm_studio_token") || "";
  });
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [connectionTesting, setConnectionTesting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "failed" | "cors_blocked" | "invalid_endpoint">("idle");

  const handleToggleLMStudio = (enabled: boolean) => {
    setLmStudioEnabled(enabled);
    localStorage.setItem("lm_studio_enabled", String(enabled));
    if (enabled) {
      setSelectedModel("lmstudio");
      localStorage.setItem("ai_selected_model", "lmstudio");
    } else {
      setSelectedModel("gemini-3.5-flash");
      localStorage.setItem("ai_selected_model", "gemini-3.5-flash");
    }
  };

  const handleModelChange = (modelName: string) => {
    setSelectedModel(modelName);
    localStorage.setItem("ai_selected_model", modelName);
    if (modelName === "lmstudio") {
      setLmStudioEnabled(true);
      localStorage.setItem("lm_studio_enabled", "true");
    } else {
      setLmStudioEnabled(false);
      localStorage.setItem("lm_studio_enabled", "false");
    }
  };

  const handleSaveLMSConfig = (url: string, model: string) => {
    setLmStudioUrl(url);
    setLmStudioModel(model);
    localStorage.setItem("lm_studio_url", url);
    localStorage.setItem("lm_studio_model", model);
  };

  const handleSaveLMSToken = (token: string) => {
    setLmStudioToken(token);
    localStorage.setItem("lm_studio_token", token);
  };

  const testLMStudioConnection = async (targetUrl: string, targetModel: string) => {
    setConnectionTesting(true);
    setConnectionStatus("idle");
    try {
      let sanitizedUrl = targetUrl.replace(/\/$/, "");
      if (!sanitizedUrl.endsWith("/v1")) {
        sanitizedUrl = `${sanitizedUrl}/v1`;
      }
      
      const getJSONSafe = async (response: Response) => {
        const text = await response.text();
        const trimmed = text.trim();
        if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
          throw new Error("HTML_RESPONSE");
        }
        return JSON.parse(text);
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (lmStudioToken) {
        headers["Authorization"] = `Bearer ${lmStudioToken}`;
      }

      // Let's first probe the primary configured URL
      let res = await fetch(`${sanitizedUrl}/models`, {
        method: "GET",
        headers
      });
      
      // Dynamic fallback probe: If 404 or failed and URL does not end in /v1, try appending /v1
      if (!res.ok && !sanitizedUrl.endsWith("/v1")) {
        const altUrl = `${sanitizedUrl}/v1`;
        try {
          const altRes = await fetch(`${altUrl}/models`, {
            method: "GET",
            headers
          });
          if (altRes.ok) {
            res = altRes;
            targetUrl = altUrl;
          }
        } catch (e) {}
      }

      if (res.ok) {
        try {
          const modelsData = await getJSONSafe(res);
          const activeModelId = modelsData?.data?.[0]?.id;
          // Auto-adopt the actual active model in the LM Studio to prevent any 444/404 mismatch
          if (activeModelId) {
            handleSaveLMSConfig(targetUrl.replace(/\/$/, ""), activeModelId);
          }
          setConnectionStatus("success");
        } catch (jsonErr: any) {
          if (jsonErr.message === "HTML_RESPONSE") {
            setConnectionStatus("invalid_endpoint");
          } else {
            setConnectionStatus("failed");
          }
        }
      } else {
        // Fallback test block using chat/completions endpoint
        let compRes = await fetch(`${sanitizedUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: targetModel || "any",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5
          })
        });

        // Alternately try appending /v1 for the completions fallback
        if (!compRes.ok && !sanitizedUrl.endsWith("/v1")) {
          const altUrl = `${sanitizedUrl}/v1`;
          try {
            const altCompRes = await fetch(`${altUrl}/chat/completions`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                model: targetModel || "any",
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 5
              })
            });
            if (altCompRes.ok) {
              // Successfully connected to the alt endpoint, see if we can get active model too
              let detectedModel = targetModel;
              try {
                const subModels = await fetch(`${altUrl}/models`, { method: "GET" });
                if (subModels.ok) {
                  const sD = await getJSONSafe(subModels);
                  detectedModel = sD?.data?.[0]?.id || targetModel;
                }
              } catch (e) {}
              handleSaveLMSConfig(altUrl, detectedModel);
              setConnectionStatus("success");
              setConnectionTesting(false);
              return;
            }
          } catch (e) {}
        }

        if (compRes.ok || compRes.status === 400 || compRes.status === 404) {
          // If the server answered but returned a 404 Model Not Found or a 400, the link is ACTIVE!
          // We can try to fetch the models list block above to auto-correct
          let detectedModel = targetModel;
          try {
            const modelsRes = await fetch(`${sanitizedUrl}/models`, { method: "GET" });
            if (modelsRes.ok) {
              const mD = await getJSONSafe(modelsRes);
              detectedModel = mD?.data?.[0]?.id || targetModel;
            }
          } catch (mErr) {}
          handleSaveLMSConfig(sanitizedUrl, detectedModel);
          setConnectionStatus("success");
        } else {
          setConnectionStatus("failed");
        }
      }
    } catch (err: any) {
      if (err.message === "HTML_RESPONSE") {
        setConnectionStatus("invalid_endpoint");
        setConnectionTesting(false);
        return;
      }
      console.warn("LM Studio connection test failed, running CORS checker fallback (intended behaviour if offline)", err);
      try {
        const sanitizedUrl = targetUrl.replace(/\/$/, "");
        // If a standard fetch throws due to CORS, a 'no-cors' mode fetch allows us to distinguish
        // if the port is open and listening versus being completely offline/unreachable.
        await fetch(`${sanitizedUrl}/models`, {
          method: "GET",
          mode: "no-cors"
        });
        setConnectionStatus("cors_blocked");
      } catch (noCorsError) {
        // Probe no-cors with /v1
        try {
          const sanitizedUrl = targetUrl.replace(/\/$/, "");
          if (!sanitizedUrl.endsWith("/v1")) {
            await fetch(`${sanitizedUrl}/v1/models`, {
              method: "GET",
              mode: "no-cors"
            });
            handleSaveLMSConfig(`${sanitizedUrl}/v1`, targetModel);
            setConnectionStatus("cors_blocked");
            setConnectionTesting(false);
            return;
          }
        } catch (subErr) {}
        setConnectionStatus("failed");
      }
    } finally {
      setConnectionTesting(false);
    }
  };

  const extractWithLocalLLM = async (textToParse: string, descriptionTopic: string) => {
    const categoriesListStr = CATEGORIES.join(", ");
    let sanitizedUrl = lmStudioUrl.replace(/\/$/, "");
    if (!sanitizedUrl.endsWith("/v1")) {
      sanitizedUrl = `${sanitizedUrl}/v1`;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (lmStudioToken) {
      headers["Authorization"] = `Bearer ${lmStudioToken}`;
    }

    setLoadingStep("Constructing Local LLM Structured Extraction payload...");
    const systemInstruction = `=== Operational Mandate ===
You function as the primary data ingestion filter for the archive. For every news item or text provided, you must execute a strict two-step process: Evaluate then Extract.

Step 1: Evaluation (Inclusion/Exclusion Quality Gate)
Analyze the incoming text against the archive quality threshold. 

CRITICAL REJECTION RULE: If ALL provided articles/texts fail to meet the high threshold, or if they consist entirely of routine updates, speculative op-eds, and minor news, you must immediately halt execution and return exactly this string: "NO SIGNIFICANT HEADLINES FOUND". Do not populate the parameters below if the batch is rejected.

To be accepted, the event must fit one of the existing system categories and represent a paradigm shift, a verified milestone, or a macro historical event:
• Computing & Science: Paradigm-shifting technological leaps, hardware milestones, or verified discoveries (e.g., specific compute benchmarks, architecture releases, peer-reviewed quantum or genetic leaps).
• Global Affairs & Politics: Macro-scale events that fundamentally alter human history, rewrite international relations, or represent monumental national governance shifts (e.g., international peace accords, declarations of war, or total regime changes).
• Economic Metrics, Infrastructure, Transportation, & Environment: Systemic, macro-level structural updates (e.g., global trade routes closing, unprecedented environmental changes, or foundational infrastructure overhauls).
• Culture, Education, Health, Law, & Sports: Definitive, record-shattering, or universally historic milestone events only.

CRITICAL DISCARD RULES (Exclusion Criteria):
1. Discard Routine Domestic Politics: Reject standard legislative debates, internal government policy squabbles, local or national elections, partisan campaign rhetoric, and polling data. 
2. Discard Speculative Language: Reject articles containing forward-looking hype or unverified claims ("could unlock," "promises to change," "aims to build"). Only archive realized milestones.
3. Discard Minor/Transient Updates: Reject routine consumer product updates, corporate PR announcements, retrospective academic papers, short-term market fluctuations, and daily sports/entertainment news.

Step 2: Parameter Population
If and only if the news item passes the strict criteria in Step 1, parse the text to populate the following system parameters:
1. "category": Must be one of the defined 13 categories: ${categoriesListStr}
2. "variable": A short uppercase snake_case string (Alpha-numeric & underscores only, e.g., 'SPACEX_STARSHIP_FLIGHT') acting as a unique key descriptor.
3. "value" (The "value" Parameter): Extract the core, defining quantifiable metric, benchmark, or specific breakthrough fact. Keep this short, isolated, and data-dense (e.g., "20 Petaflops FP4" or "Permanent Ceasefire Signed").
4. "context" (The "context" Parameter): Synthesize a dense, factual, 1-to-2 sentence summary detailing the entity, the announcement date, the core capabilities, and the structural global impact. Keep the tone completely neutral; do not include editorial commentary or media fluff.

Format: If the batch passes Step 1, output ONLY a valid and parsable raw JSON array starting with '[' and ending with ']'. If rejected, output ONLY the string: NO SIGNIFICANT HEADLINES FOUND`;

    const userPrompt = `Extract up to 5 verified, distinct key facts from the following context/document related to "${descriptionTopic || "Factual Research"}" and categorize them correctly:\n---\n${textToParse}\n---`;

    // Dynamic model discovery to guarantee 0 model config mismatches
    let modelToUse = lmStudioModel || "";
    if (!modelToUse) {
      try {
        const modelsRes = await fetch(`${sanitizedUrl}/models`, {
          method: "GET",
          headers
        });
        if (modelsRes.ok) {
          const text = await modelsRes.text();
          if (!text.trim().startsWith("<")) {
            const modelsData = JSON.parse(text);
            const firstId = modelsData?.data?.[0]?.id;
            if (firstId) {
              modelToUse = firstId;
              handleSaveLMSConfig(lmStudioUrl, firstId);
            }
          }
        }
      } catch (e) {
        console.warn("Could not auto-detect active LM Studio model:", e);
      }
    }
    if (!modelToUse) {
      modelToUse = "meta-llama-3-8b-instruct";
    }

    const requestPayload = {
      model: modelToUse,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1
    };

    setLoadingStep(`Sending fetch to local LM Studio endpoint at ${sanitizedUrl}...`);
    let res;
    let urlToUse = `${sanitizedUrl}/chat/completions`;
    try {
      res = await fetch(urlToUse, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload)
      });
      
      // Auto-correct: Switch to /v1 endpoint on 404 if /v1 was not appended
      if (res.status === 404 && !sanitizedUrl.endsWith("/v1")) {
        const altUrl = `${sanitizedUrl}/v1`;
        setLoadingStep(`Primary endpoint 404ed. Trying auto-corrected fallback ${altUrl}/chat/completions...`);
        const altRes = await fetch(`${altUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestPayload)
        });
        if (altRes.ok) {
          res = altRes;
          handleSaveLMSConfig(altUrl, modelToUse); // Persist updated path
        }
      }

      // If we got a 404 and it's because the active model changed or wasn't loaded, let's auto-retry using the dynamic model list!
      if (res && res.status === 404) {
        setLoadingStep("Model loading mismatch detected (404). Querying active models listed in LM Studio...");
        let detectedModel = "";
        try {
          const currentSanitized = sanitizedUrl.endsWith("/v1") ? sanitizedUrl : `${sanitizedUrl}/v1`;
          const mRes = await fetch(`${currentSanitized}/models`, { method: "GET", headers });
          if (mRes.ok) {
            const mText = await mRes.text();
            if (!mText.trim().startsWith("<")) {
              const mData = JSON.parse(mText);
              detectedModel = mData?.data?.[0]?.id || "";
            }
          }
        } catch (e) {}

        if (detectedModel) {
          setLoadingStep(`Retrying extraction using loaded model identifier: "${detectedModel}"...`);
          const retryPayload = { ...requestPayload, model: detectedModel };
          const retryRes = await fetch(sanitizedUrl.endsWith("/v1") ? `${sanitizedUrl}/chat/completions` : `${sanitizedUrl}/v1/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify(retryPayload)
          });
          if (retryRes.ok) {
            res = retryRes;
            handleSaveLMSConfig(sanitizedUrl.endsWith("/v1") ? sanitizedUrl : `${sanitizedUrl}/v1`, detectedModel);
          }
        }
      }
    } catch (fetchError: any) {
      // Catch exceptions (like connection refused) when /v1 might have been missing
      if (!sanitizedUrl.endsWith("/v1")) {
        try {
          const altUrl = `${sanitizedUrl}/v1`;
          const altRes = await fetch(`${altUrl}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify(requestPayload)
          });
          if (altRes.ok) {
            res = altRes;
            handleSaveLMSConfig(altUrl, modelToUse);
          } else {
            throw new Error(`LM Studio alt returned status ${altRes.status}`);
          }
        } catch (altErr) {
          console.warn("Local LLM fetch exception:", fetchError);
          throw new Error(`Failed to fetch from LM Studio at "${sanitizedUrl}". 
 
This is usually caused by one of these reasons:
1. LM Studio is not running (Default port is 1234). Open LM Studio and click the Local Server icon (double arrow) on the left panel, load a model, and turn the server ON.
2. CORS requests are blocked by the browser because the application is served over HTTPS while LM Studio runs on HTTP. Please allow insecure content in your browser for this origin, or start LM Studio with CORS allowed under server parameters.`);
        }
      } else {
        console.warn("Local LLM fetch exception:", fetchError);
        throw new Error(`Failed to fetch from LM Studio at "${sanitizedUrl}". 
 
This is usually caused by one of these reasons:
1. "Local Server" in LM Studio is not switched ON. Open LM Studio, click the Local Server tab on the side icon, and turn the server switch to ON.
2. CORS queries are blocked. Please scroll down in your browser's site settings to allow mixed / insecure content for this page, or enable CORS in LM Studio.`);
      }
    }

    if (!res || !res.ok) {
      const status = res ? res.status : "unknown";
      const statusText = res ? res.statusText : "";
      let detailMsg = "";
      if (status === 404) {
        detailMsg = `\n\nTips to resolve 404 Not Found error:\n- Ensure the Base Server URL is correct and includes '/v1' at the end (e.g. use 'http://localhost:1234/v1' instead of 'http://localhost:1234').\n- Verify inside LM Studio that a model is currently loaded and active.\n- Confirm that the Active Model identifier ("${lmStudioModel || "meta-llama-3-8b-instruct"}") matches whichever model is currently loaded inside your LM Studio dashboard (or leave it blank so it auto-targets whatever model is active in LM Studio).`;
      }
      throw new Error(`LM Studio returned server status error ${status}: ${statusText}${detailMsg}`);
    }

    const data = await res.json();
    console.log("[LM Studio Response Data]:", data);
    setLoadingStep("Extracting response context and validating syntax...");
    
    let completionText = "";
    if (data.choices?.[0]?.message?.content !== undefined) {
      completionText = data.choices[0].message.content;
    } else if (data.choices?.[0]?.text !== undefined) {
      completionText = data.choices[0].text;
    } else if (data.error?.message) {
      throw new Error(`LM Studio returned an error: ${data.error.message}`);
    } else {
      throw new Error(`Unexpected response format from LM Studio. Raw response: ${JSON.stringify(data)}`);
    }

    if (!completionText || !completionText.trim()) {
      throw new Error("Empty response returned from the local LM Studio model.");
    }

    completionText = completionText.trim();
    if (completionText === "NO_SIGNIFICANT_ITEMS_FOUND" || 
        completionText === '"NO_SIGNIFICANT_ITEMS_FOUND"' || 
        completionText.includes("NO_SIGNIFICANT_ITEMS_FOUND") ||
        completionText === "NO SIGNIFICANT HEADLINES FOUND" || 
        completionText === '"NO SIGNIFICANT HEADLINES FOUND"' || 
        completionText.includes("NO SIGNIFICANT HEADLINES FOUND")) {
      const err = new Error("NO SIGNIFICANT HEADLINES FOUND");
      (err as any).isRejection = true;
      throw err;
    }

    if (completionText.includes("```")) {
      const startBracket = completionText.indexOf("[");
      const endBracket = completionText.lastIndexOf("]");
      if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
        completionText = completionText.substring(startBracket, endBracket + 1);
      } else {
        completionText = completionText.replace(/```json/gi, "").replace(/```/g, "").trim();
      }
    }

    try {
      const parsed = JSON.parse(completionText);
      if (Array.isArray(parsed)) {
        const validFacts = parsed.filter((item: any) => {
          return (
            item &&
            typeof item === "object" &&
            typeof item.category === "string" &&
            typeof item.variable === "string" &&
            typeof item.value === "string" &&
            typeof item.context === "string"
          );
        }).map((item: any) => {
          const matchedCategory = CATEGORIES.find(
            (c) => c.toLowerCase() === item.category.toLowerCase()
          ) || "Science";
          
          return {
            category: matchedCategory,
            variable: item.variable.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/^[^A-Z]+/, ""),
            value: item.value,
            context: item.context
          };
        });

        return validFacts;
      } else if (typeof parsed === "object" && parsed !== null) {
        const potentialArray = parsed.facts || Object.values(parsed).find(v => Array.isArray(v));
        if (Array.isArray(potentialArray)) {
          return potentialArray.map((item: any) => {
            const matchedCategory = CATEGORIES.find(
              (c) => c.toLowerCase() === String(item.category || "").toLowerCase()
            ) || "Science";
            return {
              category: matchedCategory,
              variable: String(item.variable || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
              value: String(item.value || ""),
              context: String(item.context || "")
            };
          });
        }
      }
      throw new Error("Local model did not return a valid list/array format.");
    } catch (parseError) {
      console.error("Local JSON parsing failed, raw response: ", completionText);
      throw new Error("Local model response was not valid JSON. Please check model logs or output format.");
    }
  };

  const handleClearResults = () => {
    setDraftFacts([]);
    setAddedDraftIndices([]);
    setErrorMsg(null);
    setFallbackNotice(null);
    setTopicQuery("");
    setRawText("");
  };

  const handleGeminiExtract = async () => {
    if (!topicQuery.trim()) {
      setErrorMsg("Please enter a research topic or search query.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setFallbackNotice(null);
    setDraftFacts([]);
    setAddedDraftIndices([]);

    if (lmStudioEnabled) {
      setLoadingStep("LM Studio Enabled: Launching client-side grounded news search...");
      try {
        const response = await fetch("/api/news-articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topicQuery }),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Failed to fetch grounding search results");
        }

        if (data.fallbackActivated) {
          setFallbackNotice("NewsAPI key unconfigured. Routed LM Studio to high-fidelity simulated grounds.");
        }

        const articles = data.articles || [];
        if (articles.length === 0) {
          setErrorMsg(`No recent research elements found for topic "${topicQuery}".`);
          setLoading(false);
          return;
        }

        setLoadingStep("Synthesizing search articles into text feeds...");
        const synthesized = articles.map((art: any, index: number) => {
          return `Article #${index + 1}:\nTitle: ${art.title}\nSource: ${art.source?.name || "Unknown"}\nDate: ${art.publishedAt}\nSummary: ${art.description || ""}\nContent Snippet: ${art.content || ""}\n`;
        }).join("\n---\n");

        setLoadingStep("Routing extraction context to LM Studio locally...");
        const localFacts = await extractWithLocalLLM(synthesized, topicQuery);
        setDraftFacts(localFacts);
      } catch (err: any) {
        console.error(err);
        if (err.message === "NO_SIGNIFICANT_ITEMS_FOUND" || err.message === "NO SIGNIFICANT HEADLINES FOUND") {
          setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
          setDraftFacts([]);
        } else {
          setErrorMsg(err.message || "An error occurred during local LLM Grounded Search extraction.");
        }
      } finally {
        setLoading(false);
        setLoadingStep("");
      }
      return;
    }

    setLoadingStep(`Connecting to ${selectedModel}...`);
    try {
      setLoadingStep("Conducting Google Grounded Web Sweep...");
      const response = await fetch("/api/gemini-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicQuery,
          method: "search",
          model: selectedModel
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to extract facts");
      }

      setLoadingStep("Parsing facts into compliant schemas...");
      if (data.fallbackActivated) {
        setFallbackNotice(data.message || "Simulated local parsing fallback activated.");
      }

      if (data.rejected || data.message === "NO_SIGNIFICANT_ITEMS_FOUND" || data.message === "NO SIGNIFICANT HEADLINES FOUND") {
        setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
        setDraftFacts([]);
        return;
      }

      if (data.facts && Array.isArray(data.facts)) {
        setDraftFacts(data.facts);
      } else {
        setDraftFacts([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during Gemini extraction.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleNewsAPIExtract = async () => {
    if (!topicQuery.trim()) {
      setErrorMsg("Please enter a research topic.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setFallbackNotice(null);
    setDraftFacts([]);
    setAddedDraftIndices([]);

    if (lmStudioEnabled) {
      setLoadingStep("LM Studio Enabled: Calling News wire feed directly...");
      try {
        const response = await fetch("/api/news-articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topicQuery }),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Failed to query NewsAPI articles");
        }

        if (data.fallbackActivated) {
          setFallbackNotice("NewsAPI not configured. Switched local router to high-confidence simulated grounding articles.");
        }

        const articles = data.articles || [];
        if (articles.length === 0) {
          setErrorMsg(`No recent news wires found for topic "${topicQuery}".`);
          setLoading(false);
          return;
        }

        setLoadingStep("Formatting headlines payload for local extraction...");
        const synthesized = articles.map((art: any, index: number) => {
          return `Article #${index + 1}:\nTitle: ${art.title}\nSource: ${art.source?.name || "Unknown"}\nDate: ${art.publishedAt}\nSummary: ${art.description || ""}\nContent Snippet: ${art.content || ""}\n`;
        }).join("\n---\n");

        setLoadingStep("Routing news articles to LM Studio locally...");
        const localFacts = await extractWithLocalLLM(synthesized, topicQuery);
        setDraftFacts(localFacts);
      } catch (err: any) {
        console.error(err);
        if (err.message === "NO_SIGNIFICANT_ITEMS_FOUND" || err.message === "NO SIGNIFICANT HEADLINES FOUND") {
          setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
          setDraftFacts([]);
        } else {
          setErrorMsg(err.message || "An error occurred during local LLM News wire extraction.");
        }
      } finally {
        setLoading(false);
        setLoadingStep("");
      }
      return;
    }

    setLoadingStep("Initiating NewsAPI queries...");
    try {
      setLoadingStep("Retrieving verified news feeds (relevance-sorted)...");
      const response = await fetch("/api/news-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicQuery, model: selectedModel }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to query NewsAPI");
      }

      setLoadingStep("Running headlines through Gemini to filter telemetry & extract 100% verified facts...");
      if (data.fallbackActivated) {
        setFallbackNotice(data.message || "NewsAPI fallback mode active.");
      }

      if (data.rejected || data.message === "NO_SIGNIFICANT_ITEMS_FOUND" || data.message === "NO SIGNIFICANT HEADLINES FOUND") {
        setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
        setDraftFacts([]);
        return;
      }

      if (data.facts && Array.isArray(data.facts)) {
        setDraftFacts(data.facts);
      } else {
        setDraftFacts([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during NewsAPI extraction.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleNewsDataExtract = async () => {
    if (!topicQuery.trim()) {
      setErrorMsg("Please enter a research topic.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setFallbackNotice(null);
    setDraftFacts([]);
    setAddedDraftIndices([]);

    if (lmStudioEnabled) {
      setLoadingStep("LM Studio Enabled: Calling NewsData.io wire feed directly...");
      try {
        const response = await fetch("/api/newsdata-articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topicQuery }),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Failed to query NewsData.io articles");
        }

        if (data.fallbackActivated) {
          setFallbackNotice("NewsData.io not configured. Switched local router to high-confidence simulated grounding articles.");
        }

        const articles = data.articles || [];
        if (articles.length === 0) {
          setErrorMsg(`No recent NewsData.io wires found for topic "${topicQuery}".`);
          setLoading(false);
          return;
        }

        setLoadingStep("Formatting headlines payload for local extraction...");
        const synthesized = articles.map((art: any, index: number) => {
          return `Article #${index + 1}:\nTitle: ${art.title}\nSource: ${art.source?.name || "Unknown"}\nDate: ${art.publishedAt}\nSummary: ${art.description || ""}\nContent Snippet: ${art.content || ""}\n`;
        }).join("\n---\n");

        setLoadingStep("Routing news articles to LM Studio locally...");
        const localFacts = await extractWithLocalLLM(synthesized, topicQuery);
        setDraftFacts(localFacts);
      } catch (err: any) {
        console.error(err);
        if (err.message === "NO_SIGNIFICANT_ITEMS_FOUND" || err.message === "NO SIGNIFICANT HEADLINES FOUND") {
          setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
          setDraftFacts([]);
        } else {
          setErrorMsg(err.message || "An error occurred during local LLM NewsData.io extraction.");
        }
      } finally {
        setLoading(false);
        setLoadingStep("");
      }
      return;
    }

    setLoadingStep("Initiating NewsData.io queries...");
    try {
      setLoadingStep("Retrieving verified news feeds from NewsData.io...");
      const response = await fetch("/api/newsdata-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicQuery, model: selectedModel }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to query NewsData.io");
      }

      setLoadingStep("Running headlines through Gemini to filter telemetry & extract 100% verified facts...");
      if (data.fallbackActivated) {
        setFallbackNotice(data.message || "NewsData.io fallback mode active.");
      }

      if (data.rejected || data.message === "NO_SIGNIFICANT_ITEMS_FOUND" || data.message === "NO SIGNIFICANT HEADLINES FOUND") {
        setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
        setDraftFacts([]);
        return;
      }

      if (data.facts && Array.isArray(data.facts)) {
        setDraftFacts(data.facts);
      } else {
        setDraftFacts([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during NewsData.io extraction.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleDirectTextExtract = async () => {
    if (!rawText.trim()) {
      setErrorMsg("Please paste some text content first.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setFallbackNotice(null);
    setDraftFacts([]);
    setAddedDraftIndices([]);

    if (lmStudioEnabled) {
      setLoadingStep("Loading LM Studio parser router...");
      try {
        const localFacts = await extractWithLocalLLM(rawText, "Raw Fact Ingestion");
        setDraftFacts(localFacts);
      } catch (err: any) {
        console.error(err);
        if (err.message === "NO_SIGNIFICANT_ITEMS_FOUND" || err.message === "NO SIGNIFICANT HEADLINES FOUND") {
          setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
          setDraftFacts([]);
        } else {
          setErrorMsg(err.message || "An error occurred during local LLM text parsing.");
        }
      } finally {
        setLoading(false);
        setLoadingStep("");
      }
      return;
    }

    setLoadingStep(`Submitting content to ${selectedModel} parser...`);
    try {
      setLoadingStep("Synthesizing raw text into category nodes...");
      const response = await fetch("/api/gemini-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          method: "text",
          model: selectedModel
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to parse text");
      }

      setLoadingStep("Verifying parameters and syntax constraints...");
      if (data.fallbackActivated) {
        setFallbackNotice(data.message || "Direct text extraction fallback active.");
      }

      if (data.rejected || data.message === "NO_SIGNIFICANT_ITEMS_FOUND" || data.message === "NO SIGNIFICANT HEADLINES FOUND") {
        setErrorMsg("NO SIGNIFICANT HEADLINES FOUND");
        setDraftFacts([]);
        return;
      }

      if (data.facts && Array.isArray(data.facts)) {
        setDraftFacts(data.facts);
      } else {
        setDraftFacts([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during text parsing.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const addSingleDraft = (index: number) => {
    const draft = draftFacts[index];
    if (!draft.variable.trim() || !draft.value.trim() || !draft.context.trim()) {
      setDraftErrors((prev) => ({
        ...prev,
        [index]: "Incomplete data: Missing short title or details"
      }));
      return;
    }
    // Format variable: UPPERCASE and underscores
    const formattedVar = draft.variable.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/^[^A-Z]+/, "");
    if (!formattedVar) {
      setDraftErrors((prev) => ({
        ...prev,
        [index]: "Incomplete data: Missing short title or details"
      }));
      return;
    }

    const res = onAddFact(draft.category, formattedVar, draft.value, draft.context);
    if (res && !res.success) {
      setDraftErrors((prev) => ({
        ...prev,
        [index]: res.error || "Failed to append."
      }));
    } else {
      setAddedDraftIndices((prev) => [...prev, index]);
      setDraftErrors((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });

      // Target the newly rendered/highlighted DOM node inside the left column and scroll smoothly
      const container = document.querySelector(".left-data-column");
      const targetElement = document.getElementById(`entry-${formattedVar}`);

      if (container && targetElement) {
        // 1. Calculate structural positions
        const containerTop = container.getBoundingClientRect().top;
        const elementTop = targetElement.getBoundingClientRect().top;
        
        // Center the target element inside the container frame
        const targetScrollTop = container.scrollTop + (elementTop - containerTop) - (container.clientHeight / 2) + (targetElement.clientHeight / 2);
        
        const startScrollTop = container.scrollTop;
        const distance = targetScrollTop - startScrollTop;
        
        // 2. Control animation timing bounds (1200ms gives a beautiful, cinematic glide)
        const duration = 1200; 
        let startTime: number | null = null;

        // 3. Quad Ease-In-Out formula: Accel to half, decelerate to target point
        const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
          t /= d / 2;
          if (t < 1) return (c / 2) * t * t + b;
          t--;
          return (-c / 2) * (t * (t - 2) - 1) + b;
        };

        // 4. Animation loop frame runner
        const animationLoop = (currentTime: number) => {
          if (!startTime) startTime = currentTime;
          const timeElapsed = currentTime - startTime;

          // Interpolate next position coordinate
          container.scrollTop = easeInOutQuad(timeElapsed, startScrollTop, distance, duration);

          if (timeElapsed < duration) {
            requestAnimationFrame(animationLoop);
          } else {
            container.scrollTop = targetScrollTop; // Perfect snap layout correction at end
          }
        };

        // Run the loop asynchronously after the layout engine finishes painting the new element
        requestAnimationFrame(() => {
          setTimeout(() => {
            requestAnimationFrame(animationLoop);
          }, 50);
        });
      }
    }
  };

  const handleUpdateDraft = (index: number, field: keyof ExtractedFact, newVal: string) => {
    setDraftFacts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: newVal };
      return copy;
    });
  };

  const handleAddAllSelected = () => {
    draftFacts.forEach((draft, idx) => {
      if (!addedDraftIndices.includes(idx)) {
        if (!draft.variable.trim() || !draft.value.trim() || !draft.context.trim()) {
          setDraftErrors((prev) => ({
            ...prev,
            [idx]: "Incomplete data: Missing short title or details"
          }));
          return;
        }

        const formattedVar = draft.variable.toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/^[^A-Z]+/, "");
        if (!formattedVar) {
          setDraftErrors((prev) => ({
            ...prev,
            [idx]: "Incomplete data: Missing short title or details"
          }));
          return;
        }

        const res = onAddFact(draft.category, formattedVar, draft.value, draft.context);
        if (res && !res.success) {
          setDraftErrors((prev) => ({
            ...prev,
            [idx]: res.error || "Failed to append."
          }));
        } else {
          setAddedDraftIndices((prev) => [...prev, idx]);
          setDraftErrors((prev) => {
            const copy = { ...prev };
            delete copy[idx];
            return copy;
          });
        }
      }
    });
  };

  return (
    <div id="ai-research-panel-card" className="bg-[#FDFCF8] border border-[#1A1A1A]/15 rounded-none overflow-hidden shadow-sm">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-6 py-4 bg-[#1A1A1A]/5 border-b border-[#1A1A1A]/15 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1A]/10 select-none"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#C2410C]" />
          <h2 className="font-serif text-lg font-bold italic text-[#1A1A1A]">Fact Extractor</h2>
        </div>
        <div className="flex items-center gap-2 inline-flex" onClick={(e) => e.stopPropagation()}>
          {/* Settings button */}
          <button
            type="button"
            onClick={() => {
              if (!isExpanded) {
                setIsExpanded(true);
              }
              setShowSettings(!showSettings);
            }}
            className={`px-2.5 py-[5px] flex items-center justify-center border rounded-none transition-all cursor-pointer ${
              showSettings 
                ? "bg-[#C2410C] text-[#FDFCF8] border-[#C2410C]" 
                : "bg-white hover:bg-[#1A1A1A]/5 border-[#1A1A1A]/15 text-[#1A1A1A]/75"
            }`}
            title="Model and Source Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Chevron expand/collapse toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] bg-white hover:bg-[#1A1A1A]/5 px-2.5 py-[5px] rounded-none border border-[#1A1A1A]/15 text-[#1A1A1A]/75 font-mono uppercase cursor-pointer"
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Settings Panel */}
          {showSettings && (
            <div className="p-6 bg-[#f4f3ed] border-b border-[#1A1A1A]/15 space-y-6">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#C2410C]" />
                  RESEARCH & MODEL SETTINGS
                </h3>
                <span className="text-[9px] bg-[#1A1A1A]/10 text-[#1A1A1A]/85 px-2.5 py-1 font-bold font-mono tracking-wider">
                  ACTIVE CONFIG
                </span>
              </div>

              {/* Main settings row: Model & Source */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-model-selector" className="block text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1.5">
                    LLM Core Model
                  </label>
                  <select
                    id="settings-model-selector"
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A]/40 rounded-none px-3 py-1.5 text-xs font-mono font-medium text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                    <option value="lmstudio">LM Studio (Local Model)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="settings-source-dropdown" className="block text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1.5">
                    Research Ingestion Source
                  </label>
                  <select
                    id="settings-source-dropdown"
                    value={activeTab}
                    onChange={(e) => { setActiveTab(e.target.value as TabType); setErrorMsg(null); }}
                    className="w-full bg-white border border-[#1A1A1A]/20 hover:border-[#1A1A1A]/40 rounded-none px-3 py-1.5 text-xs font-mono font-medium text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] cursor-pointer"
                  >
                    <option value="newsapi">News Wire</option>
                    <option value="newsdata">NewsData.io</option>
                    <option value="grounding">Google Search</option>
                    <option value="text">Raw Ingestor</option>
                  </select>
                </div>
              </div>

              {/* Active Source Guideline/Description Card */}
              <div className="bg-white border border-[#1A1A1A]/10 p-4 space-y-2">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/60">Source Info:</span>
                {activeTab === "grounding" && (
                  <div className="flex gap-2 items-start text-[#1A1A1A]/80 text-xs">
                    <Info className="w-4 h-4 text-[#C2410C] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Search Grounding:</strong> Leverages real-time Google search grounding to retrieve newly recorded facts up to today. This patches model training limits without needing complex key setups.
                    </span>
                  </div>
                )}
                {activeTab === "newsapi" && (
                  <div className="flex gap-2 items-start text-[#1A1A1A]/80 text-xs">
                    <Info className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>NewsAPI Route:</strong> Accesses recent global news articles using your configured NewsAPI Key. Perfect if looking for raw headlines, which Gemini compiles into clear database nodes.
                    </span>
                  </div>
                )}
                {activeTab === "newsdata" && (
                  <div className="flex gap-2 items-start text-[#1A1A1A]/80 text-xs">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>NewsData.io Route:</strong> Fetches recent articles from news sources worldwide using your NewsData.io credentials. Headlines are refined by Gemini into clean archive metrics.
                    </span>
                  </div>
                )}
                {activeTab === "text" && (
                  <div className="flex gap-2 items-start text-[#1A1A1A]/80 text-xs">
                    <Info className="w-4 h-4 text-[#C2410C] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Structured Parser:</strong> Ideal for paste-in journal entries, notes, or raw texts. Gemini parses them in a non-destructive manner into variable/context key pairs.
                    </span>
                  </div>
                )}
              </div>

              {/* LM Studio specific settings section (highlighted or styled separate) */}
              <div className="border-t border-[#1A1A1A]/10 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1A1A1A]/80">
                    LM Studio Configuration (Optional)
                  </h4>
                  {lmStudioEnabled && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold font-mono tracking-wider">
                      ACTIVE ROUTER
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#1A1A1A]/80 space-y-2 bg-white border border-[#1A1A1A]/10 p-3.5">
                  <p>
                    <strong>How to use local LLM models:</strong>
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-[#1A1A1A]/70 font-mono text-[10px]">
                    <li>Open LM Studio on your local desktop.</li>
                    <li>In the Developer Server tab, load a model and toggle the **Local Server** switch ON.</li>
                    <li>Toggle the model dropdown above to **LM Studio** to activate local parsing.</li>
                  </ol>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); testLMStudioConnection(lmStudioUrl, lmStudioModel); }} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1.5">
                        CORS Connection Tester
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={connectionTesting}
                          className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] disabled:opacity-50 text-[10px] font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 transition-colors cursor-pointer h-[32px] flex-shrink-0"
                        >
                          {connectionTesting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : "TEST LOCAL ENDPOINT"}
                        </button>
                        <div className="px-4 flex items-center justify-center border border-[#1A1A1A]/15 bg-white text-[9px] font-mono tracking-wider font-bold h-[32px] min-w-[120px]">
                          {connectionStatus === "idle" && <span className="text-[#1A1A1A]/50">UNTESTED</span>}
                          {connectionStatus === "success" && <span className="text-emerald-700 font-bold">● ONLINE / CORS OK</span>}
                          {connectionStatus === "cors_blocked" && <span className="text-amber-600 font-bold">● CORS BLOCKED</span>}
                          {connectionStatus === "invalid_endpoint" && <span className="text-[#C2410C] font-bold">● INVALID ENDPOINT (HTML)</span>}
                          {connectionStatus === "failed" && <span className="text-rose-600 font-bold">● OFFLINE</span>}
                        </div>
                      </div>
                      {connectionStatus === "cors_blocked" && (
                        <p className="mt-2 text-[10px] text-amber-700 leading-snug font-mono">
                          ⚠️ <strong>Local port is open</strong>, but blocked by CORS. Under LM Studio Developer tab, enable CORS queries or allow insecure HTTP mixed-content inside your browser site settings for this tab.
                        </p>
                      )}
                      {connectionStatus === "invalid_endpoint" && (
                        <p className="mt-2 text-[10px] text-[#C2410C] leading-snug font-mono">
                          ⚠️ <strong>The server returned an HTML webpage</strong> instead of a JSON response. This usually means the Base Server URL is pointing to a standard web server (like this app) rather than the LM Studio API port (typically <code>http://localhost:1234/v1</code>).
                        </p>
                      )}
                      {connectionStatus === "failed" && (
                        <p className="mt-2 text-[10px] text-rose-600 leading-snug font-mono">
                          ⚠️ Unable to connect to <code>{lmStudioUrl}</code>. Make sure LM Studio application is active, the Local Server switch is toggled ON, and the active port matches.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1.5">
                        LM Studio Base Server URL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. http://localhost:1234/v1"
                        value={lmStudioUrl}
                        onChange={(e) => handleSaveLMSConfig(e.target.value, lmStudioModel)}
                        className="w-full bg-white border border-[#1A1A1A]/20 rounded-none px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1.5">
                        Local Model ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Auto-match (leave empty) or exact loaded identifier..."
                        value={lmStudioModel}
                        onChange={(e) => handleSaveLMSConfig(lmStudioUrl, e.target.value)}
                        className="w-full bg-white border border-[#1A1A1A]/20 rounded-none px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono font-bold text-[#1A1A1A]/70 mb-1.5">
                        API Key / Bearer Token (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Bearer token if authentication is enabled..."
                        value={lmStudioToken}
                        onChange={(e) => handleSaveLMSToken(e.target.value)}
                        className="w-full bg-white border border-[#1A1A1A]/20 rounded-none px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-mono"
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* Tab content area */}
            {activeTab === "grounding" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-[#1A1A1A]/70 mb-1.5 font-bold font-mono">GOOGLE SEARCH QUERY</label>
                  <form onSubmit={(e) => { e.preventDefault(); handleGeminiExtract(); }} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SpaceX Starship flights, global space agencies..."
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      disabled={loading}
                      className="flex-1 bg-white border border-[#1A1A1A]/20 rounded-none px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] placeholder-[#1A1A1A]/35"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] disabled:opacity-50 text-[10px] uppercase tracking-wider font-bold px-4 rounded-none flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={handleClearResults}
                      disabled={loading}
                      className="border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FDFCF8] text-[10px] uppercase tracking-wider font-bold px-4 rounded-none transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "newsapi" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-[#1A1A1A]/70 mb-1.5 font-bold font-mono">NEWS WIRE SEARCH QUERY</label>
                  <form onSubmit={(e) => { e.preventDefault(); handleNewsAPIExtract(); }} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. inflation rates, trade pacts..."
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      disabled={loading}
                      className="flex-1 bg-white border border-[#1A1A1A]/20 rounded-none px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] placeholder-[#1A1A1A]/35"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] disabled:opacity-50 text-[10px] uppercase tracking-wider font-bold px-4 rounded-none flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Fetch
                    </button>
                    <button
                      type="button"
                      onClick={handleClearResults}
                      disabled={loading}
                      className="border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FDFCF8] text-[10px] uppercase tracking-wider font-bold px-4 rounded-none transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "newsdata" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-[#1A1A1A]/70 mb-1.5 font-bold font-mono">NEWSDATA.IO SEARCH QUERY</label>
                  <form onSubmit={(e) => { e.preventDefault(); handleNewsDataExtract(); }} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. general artificial intelligence, superconductor..."
                      value={topicQuery}
                      onChange={(e) => setTopicQuery(e.target.value)}
                      disabled={loading}
                      className="flex-1 bg-white border border-[#1A1A1A]/20 rounded-none px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] placeholder-[#1A1A1A]/35"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] disabled:opacity-50 text-[10px] uppercase tracking-wider font-bold px-4 rounded-none flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      Fetch
                    </button>
                    <button
                      type="button"
                      onClick={handleClearResults}
                      disabled={loading}
                      className="border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FDFCF8] text-[10px] uppercase tracking-wider font-bold px-4 rounded-none transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-[#1A1A1A]/70 mb-1.2 font-bold font-mono">RAW TEXT</label>
                  <textarea
                    rows={4}
                    placeholder="Paste news articles, press releases, reports, or data tables..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    disabled={loading}
                    className="w-full bg-white border border-[#1A1A1A]/20 rounded-none p-3 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] placeholder-[#1A1A1A]/35 font-sans resize-none"
                  ></textarea>
                  <div className="flex justify-end mt-2 gap-2">
                    <button
                      onClick={handleDirectTextExtract}
                      disabled={loading}
                      className="bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] disabled:opacity-50 text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-none flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      Extract Facts
                    </button>
                    <button
                      type="button"
                      onClick={handleClearResults}
                      disabled={loading}
                      className="border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FDFCF8] text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-none transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Global Error Banner */}
            {errorMsg && (
              <div className="mt-4 bg-[#C2410C]/5 text-[#C2410C] border border-[#C2410C]/25 p-3.5 rounded-none text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#C2410C] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-bold uppercase tracking-wider font-mono text-[10px] block mb-0.5 text-[#C2410C]">Extraction Encountered Issues</span>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Offline Fallback Notice */}
            {fallbackNotice && (
              <div className="mt-4 bg-[#C2410C]/5 text-[#1A1A1A] border border-[#C2410C]/20 p-3.5 rounded-none text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#C2410C] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-bold uppercase tracking-wider font-mono text-[10px] block mb-0.5 text-[#C2410C]">Resiliency Fallback Active</span>
                  <p className="text-[#1A1A1A]/90">{fallbackNotice}</p>
                </div>
              </div>
            )}

            {/* Loading Progress bar */}
            {loading && (
              <div className="mt-6 border border-[#1A1A1A]/15 bg-[#f4f3ed] p-5 rounded-none flex flex-col items-center justify-center text-center space-y-3">
                <RotateCw className="w-8 h-8 text-[#C2410C] animate-spin" />
                <div className="space-y-1">
                  <h4 className="font-serif italic text-sm font-bold text-[#1A1A1A]">Compiling and filtering results...</h4>
                  <p className="text-[10px] text-[#1A1A1A]/60 font-mono tracking-wide">{loadingStep}</p>
                </div>
                <div className="w-full max-w-sm bg-white border border-[#1A1A1A]/10 h-1 overflow-hidden relative">
                  <div 
                    className="bg-[#C2410C] h-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  ></div>
                </div>
                <div className="text-[9px] font-mono text-[#C2410C] font-semibold">
                  {Math.round(progress)}% COMPLETED
                </div>
              </div>
            )}

            {/* Extracted Facts List Preview */}
            {!loading && draftFacts.length > 0 && (
              <div className="mt-6 border-t border-[#1A1A1A]/15 pt-5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono text-[#1A1A1A]/70 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <BookmarkCheck className="w-4 h-4 text-[#C2410C]" />
                    Extracted Fact Drafts ({draftFacts.length})
                  </h3>
                  {draftFacts.length > addedDraftIndices.length && (
                    <button
                      onClick={handleAddAllSelected}
                      className="text-xs text-[#C2410C] hover:opacity-80 font-bold uppercase tracking-wider font-mono cursor-pointer"
                    >
                      Append All
                    </button>
                  )}
                </div>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {draftFacts.map((draft, idx) => {
                    const isAdded = addedDraftIndices.includes(idx);
                    const isAlreadyInTree = existingVariables.includes(draft.variable.toUpperCase());

                    if (
                      draft.value?.toUpperCase() === "SKIP_ITEM" ||
                      draft.context?.toUpperCase() === "SKIP_ITEM"
                    ) {
                      return null;
                    }

                    return (
                      <form
                        key={idx}
                        onSubmit={(e) => { e.preventDefault(); addSingleDraft(idx); }}
                        className={`p-4 border transition-all ${
                          isAdded
                            ? "bg-[#1A1A1A]/5 border-[#1A1A1A]/10 opacity-60"
                            : "bg-white border-[#1A1A1A]/15 hover:border-[#1A1A1A]/30 shadow-none"
                        }`}
                      >
                        {draftErrors[idx] && (
                          <div className="mb-3 bg-red-50 border border-red-200 text-red-750 p-2.5 text-[11px] font-mono flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-600 animate-pulse" />
                            <span>{draftErrors[idx]}</span>
                          </div>
                        )}
                        {/* Draft parameters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] text-[#1A1A1A]/60 uppercase font-mono mb-1 font-bold">Category</label>
                            <select
                              value={draft.category}
                              onChange={(e) => handleUpdateDraft(idx, "category", e.target.value as CategoryName)}
                              disabled={isAdded}
                              className="w-full bg-white border border-[#1A1A1A]/15 text-xs px-2 py-1 text-[#1A1A1A] focus:outline-none focus:border-[#C2410C]"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-[#1A1A1A]/60 uppercase font-mono mb-1 font-bold">Short Title</label>
                            <input
                              type="text"
                              value={draft.variable}
                              onChange={(e) => handleUpdateDraft(idx, "variable", e.target.value)}
                              disabled={isAdded}
                              className="w-full bg-white border border-[#1A1A1A]/15 text-xs px-2 py-1 text-[#1A1A1A] focus:outline-none focus:border-[#C2410C] font-mono"
                            />
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="block text-[10px] text-[#1A1A1A]/60 uppercase font-mono mb-1 font-bold">Summary</label>
                          <input
                            type="text"
                            value={draft.value}
                            onChange={(e) => handleUpdateDraft(idx, "value", e.target.value)}
                            disabled={isAdded}
                            className="w-full bg-white border border-[#1A1A1A]/15 text-xs px-2 py-1 text-[#1A1A1A]/90 focus:outline-none focus:border-[#C2410C] font-semibold"
                          />
                        </div>

                        <div className="mb-3">
                          <label className="block text-[10px] text-[#1A1A1A]/60 uppercase font-mono mb-1 font-bold">Details</label>
                          <textarea
                            value={draft.context}
                            onChange={(e) => {
                              handleUpdateDraft(idx, "context", e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = "auto";
                                el.style.height = `${el.scrollHeight}px`;
                              }
                            }}
                            disabled={isAdded}
                            className="w-full bg-white border border-[#1A1A1A]/15 text-xs p-2 text-[#1A1A1A]/80 focus:outline-none focus:border-[#C2410C] font-sans resize-none overflow-hidden min-h-[82px]"
                          ></textarea>
                        </div>

                        <div className="flex items-center justify-between">
                          {isAlreadyInTree && !isAdded ? (
                            <span className="text-[9px] text-[#C2410C] uppercase font-mono flex items-center gap-1 font-bold">
                              <Flame className="w-3 h-3 text-[#C2410C]" />
                              Overwrites Existing variable
                            </span>
                          ) : (
                            <span></span>
                          )}

                          <button
                            type="submit"
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-none text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 transition-all ${
                              isAdded
                                ? "bg-[#1A1A1A]/10 text-[#1A1A1A]/40 cursor-not-allowed"
                                : "bg-[#1A1A1A] hover:bg-[#C2410C] text-[#FDFCF8] cursor-pointer"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Appended
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Approve Fact
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
