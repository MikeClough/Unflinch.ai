(() => {
  const AEGIS_SEARCH_ENDPOINT = "https://aegis-search-bridge.mikeclough.workers.dev/api/search/rewrite";
  const DAILY_NEURON_CAP = 10000;

  const form = document.getElementById("aegisTopSearch");
  const input = form?.querySelector('input[name="q"]');
  const button = form?.querySelector("button");
  const result = document.getElementById("aegisSearchResult");
  const queryOut = document.getElementById("aegisSearchQuery");
  const reasonOut = document.getElementById("aegisSearchReason");
  const openLink = document.getElementById("aegisSearchOpen");
  const neuronValue = document.getElementById("neuronValue");
  const neuronTrack = document.getElementById("neuronTrack");

  function setStatus(text, state = "") {
    const el = document.querySelector(".search-status");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("live", "busy", "error");
    if (state) el.classList.add(state);
  }

  function setLoading(isLoading) {
    if (!button || !input) return;
    button.disabled = isLoading;
    input.disabled = isLoading;
    button.textContent = isLoading ? "Opening" : "Search";
  }

  function updateNeuronMeter(remaining) {
    if (remaining === undefined || remaining === null || Number.isNaN(Number(remaining))) return;

    const safeRemaining = Math.max(0, Math.min(DAILY_NEURON_CAP, Number(remaining)));
    const percent = Math.round((safeRemaining / DAILY_NEURON_CAP) * 100);

    if (neuronValue) neuronValue.textContent = safeRemaining.toLocaleString();
    if (neuronTrack) neuronTrack.style.width = `${percent}%`;

    const meter = document.querySelector(".neuron-meter");
    if (meter) {
      meter.title = `${safeRemaining.toLocaleString()} / ${DAILY_NEURON_CAP.toLocaleString()} AI neurons remaining today`;
    }
  }

  async function rewriteSearch(rawQuery) {
    const res = await fetch(AEGIS_SEARCH_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: rawQuery, mode: "auto" })
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "AEGIS Search Bridge could not rewrite that search.");
    }

    return data;
  }

  function showResult(query, reason, googleUrl) {
    if (queryOut) queryOut.textContent = query;
    if (reasonOut) reasonOut.textContent = reason || "AEGIS Search Bridge prepared a sharper query.";
    if (openLink) {
      openLink.href = googleUrl;
      openLink.textContent = "Open Google again";
    }
    if (result) result.hidden = false;
  }

  window.aegisHandleSearch = async function aegisHandleSearch(event) {
    if (event) event.preventDefault();

    const rawQuery = input?.value?.trim();
    if (!rawQuery) {
      input?.focus();
      return false;
    }

    // Open a blank tab immediately from the user's submit/click gesture.
    // This avoids most popup blockers after the async Worker request completes.
    const searchTab = window.open("", "_blank");
    if (searchTab) {
      searchTab.document.write("<!doctype html><title>AEGIS Search</title><body style='background:#050814;color:#dff8ff;font-family:system-ui;padding:24px'><h2>AEGIS Search is preparing your Google query…</h2><p>This tab will redirect automatically.</p></body>");
      searchTab.document.close();
    }

    try {
      setStatus("Working", "busy");
      setLoading(true);

      const data = await rewriteSearch(rawQuery);
      const googleUrl = data.google_url || ("https://www.google.com/search?q=" + encodeURIComponent(data.rewritten_query || rawQuery));

      showResult(data.rewritten_query || rawQuery, data.reason, googleUrl);
      updateNeuronMeter(data?.usage?.ai_neurons_remaining);

      if (searchTab) {
        searchTab.location.assign(googleUrl);
      } else {
        // Popup blocked: leave a visible button.
        if (reasonOut) reasonOut.textContent = (data.reason || "AEGIS prepared a sharper query.") + " Your browser blocked the new tab, so use the button.";
      }

      setStatus(data.ai_used ? "AI" : "Rules", "live");
    } catch (err) {
      const fallbackUrl = "https://www.google.com/search?q=" + encodeURIComponent(rawQuery);
      showResult(
        rawQuery,
        (err?.message || "Search rewrite failed.") + " Fallback Google search opened/available.",
        fallbackUrl
      );

      if (searchTab) {
        searchTab.location.assign(fallbackUrl);
      }

      setStatus("Error", "error");
    } finally {
      setLoading(false);
    }

    return false;
  };

  form?.addEventListener("submit", window.aegisHandleSearch);

  window.AEGIS_SEARCH_BRIDGE_STATUS = {
    mode: "connected_auto_open",
    endpoint: AEGIS_SEARCH_ENDPOINT
  };
})();
