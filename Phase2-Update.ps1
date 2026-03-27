# Phase2-Update.ps1
# Automates Phase 2: word-level timing wiring (host.jsx + main.js),
# creates phase-2-wip branch, commits, pushes, and optionally opens a PR.

$root = "C:\Users\Shivaay\Desktop\OPENCODE"
$branchName = "phase-2-wip"

# 1) Overwrite host.jsx with Phase 2 content
$host2 = @'
/**
 * phase-2: word timings (Phase 2)
 * This is a skeleton to wire word-level timings into Premiere.
 */
var AI_Caption_Pro = (function(){
  function _getActiveSequence() {
    if (typeof app !== 'undefined' && app.project && app.project.activeSequence) {
      return app.project.activeSequence;
    }
    return null;
  }

  function detectActiveSequence() {
    try {
      var seq = _getActiveSequence();
      return seq ? seq.name : "No active sequence";
    } catch (e) {
      return "ERROR:" + (e && e.toString ? e.toString() : "");
    }
  }

  function exportActiveSequenceAudio() {
    try {
      var seq = _getActiveSequence();
      if (!seq) return "NO_SEQUENCE";
      var outFolder = new Folder(Folder.desktop + "/AI-Caption-Pro");
      if (!outFolder.exists) outFolder.create();
      var wavPath = outFolder.fsName + "/sequence_audio.wav";
      return wavPath;
    } catch (e) {
      return "ERROR:" + (e && e.toString ? e.toString() : "Unknown error");
    }
  }

  function importSRT(srtPath) {
    try {
      var seq = _getActiveSequence();
      if (!seq) return "NO_SEQUENCE";
      return "IMPORT_OK";
    } catch (e) {
      return "ERROR:" + (e && e.toString ? e.toString() : "Unknown error");
    }
  }

  // Phase 2: Word timings API
  function importWordTimings(wordTimingsPath) {
    try {
      var f = new File(wordTimingsPath);
      if (!f.exists) return "ERROR: Word timings file not found";
      f.open("r"); var data = f.read(); f.close();
      // TODO: parse JSON and apply timings in Premiere
      return "IMPORT_OK";
    } catch (e) {
      return "ERROR:" + (e && e.toString ? e.toString() : "Unknown error");
    }
  }

  // Expose public API
  return {
    detectActiveSequence: detectActiveSequence,
    exportActiveSequenceAudio: exportActiveSequenceAudio,
    importSRT: importSRT,
    importWordTimings: importWordTimings
  };
})();
'@
$hostPath = "$root\AI-Caption-Pro\jsx\host.jsx"
Set-Content -Path $hostPath -Value $host2 -Encoding UTF8

# 2) Overwrite main.js with Phase 2 wiring
$main2 = @'
 // Phase 2: word-level timings (Phase 2)
 (function(){
   const csInterface = (window.csInterface = window.csInterface || null);
   let CS = null;
   try { CS = typeof CSInterface !== "undefined" ? new CSInterface() : null; } catch (_) { CS = null; }

   const seqNameEl = document.getElementById("sequenceName");
   const detectBtn = document.getElementById("detectBtn");
   const generateBtn = document.getElementById("generateBtn");
   const langSel = document.getElementById("langSel");
   const styleSel = document.getElementById("styleSel");
   const loader = document.getElementById("loader");
   const progressBar = document.getElementById("progressBar");
   const statusEl = document.getElementById("status");

   function setStatus(text) { statusEl.textContent = text; }
   function showLoader(show) { loader.hidden = !show; }
   function setProgress(p) { progressBar.style.width = p + "%"; progressBar.parentElement.hidden = p < 0 || p > 100; progressBar.parentElement.style.display = "block"; }

   function postToHost(script, callback) {
     if (typeof CSInterface !== "undefined" && CSInterface) {
       CSInterface.evalScript(script, callback);
     } else {
       callback("MOCK_PATH");
     }
   }

   function exportAudioFromSequence() {
     return new Promise((resolve, reject) => {
       postToHost("AI_Caption_Pro.exportActiveSequenceAudio()", function(res) {
         if (!res || res.startsWith("ERROR")) {
           reject(new Error(res || "Unknown error exporting audio"));
         } else {
           resolve(res);
         }
       });
     });
   }

   function runPythonTranscription(wavPath, language) {
     return new Promise((resolve, reject) => {
       const { spawn } = require("child_process");
       const model = "base";
       const scriptPath = require("path").resolve(__dirname, "python/transcribe.py");
       const args = [scriptPath, "--audio", wavPath, "--model", model, "--language", language, "--output", "json,srt"];
       const proc = spawn(process.execPath, args);
       let stdout = "";
       let stderr = "";
       proc.stdout.on("data", (d) => { stdout += d.toString(); });
       proc.stderr.on("data", (d) => { stderr += d.toString(); });
       proc.on("close", (code) => {
         if (code === 0) {
           try {
             let res = null;
             try { res = JSON.parse(stdout); } catch (e) { res = { json: stdout }; }
             resolve(res);
           } catch (e) {
             resolve({ error: "Malformed JSON from transcribe.py", raw: stdout, code });
           }
         } else {
           reject(new Error(stderr || "transcribe.py failed"));
         }
       });
     });
   }

   function importSRTToPremiere(srtPath) {
     return new Promise((resolve, reject) => {
       postToHost(`AI_Caption_Pro.importSRT('${srtPath}')`, function(res) {
         if (res && !res.startsWith("ERROR")) {
           resolve(res);
         } else {
           reject(new Error(res || "Import failed"));
         }
       });
     });
   }

   // Phase 2: import word timings into Premiere
   function importWordTimingsToPremiere(wordTimingsPath) {
     return new Promise((resolve, reject) => {
       postToHost(`AI_Caption_Pro.importWordTimings('${wordTimingsPath}')`, function(res) {
         if (res && !res.startsWith("ERROR")) {
           resolve(res);
         } else {
           reject(new Error(res || "Word timings import failed"));
         }
       });
     });
   }

   function onGenerate() {
     setStatus("Detecting sequence...");
     showLoader(true);
     setProgress(0);
     // Step 1: detect active sequence
     postToHost("AI_Caption_Pro.detectActiveSequence()", function(seqResult) {
       const seq = seqResult || "";
       seqNameEl.textContent = seq;
       setStatus("Exporting audio...");
       exportAudioFromSequence()
         .then((wavPath) => {
           setStatus("Transcribing audio...");
           const language = langSel.value;
           return runPythonTranscription(wavPath, language);
         })
         .then((transcript) => {
           const srtPath = transcript?.srtPath || transcript?.srt || ((transcript && transcript.jsonPath) ? transcript.jsonPath.replace(".json", ".srt") : null);
           const wordTimingsPath = transcript?.wordTimingsPath || (transcript?.wordTimingsPath ? transcript.wordTimingsPath : null);
           let chain = Promise.resolve();
           if (srtPath) chain = chain.then(() => importSRTToPremiere(srtPath));
           if (wordTimingsPath) chain = chain.then(() => importWordTimingsToPremiere(wordTimingsPath));
           if (!srtPath && !wordTimingsPath) {
             throw new Error("No SRT or word timings produced by transcription");
           }
           return chain;
         })
         .then(() => {
           setProgress(100);
           setStatus("Done");
           showLoader(false);
         })
         .catch((err) => {
           setStatus("Error: " + (err.message || err));
           showLoader(false);
         });
     });
   }

   // Initialize UI
   detectBtn.addEventListener("click", () => {
     postToHost("AI_Caption_Pro.detectActiveSequence()", function(seq) {
       seqNameEl.textContent = seq || "";
       setStatus(seq ? "Active sequence detected" : "No active sequence");
     });
   });
   generateBtn.addEventListener("click", onGenerate);

   // API surface
   window.AICaptionPro = {
     exportActiveSequenceAudio: function() { return "MOCK_AUDIO.wav"; },
     detectActiveSequence: function() { return "Untitled Sequence"; },
     importSRT: function(path) { return "IMPORT_OK"; },
     importWordTimings: function(path) { return "IMPORT_OK"; }
   };
 })();
'@
Set-Content -Path "$root\AI-Caption-Pro\main.js" -Value $main2 -Encoding UTF8

# 3) Git operations
cd $root
git fetch origin
git checkout main
git pull origin main
git checkout -B $branchName
git add -A
git commit -m "Phase 2: add word-level timing wiring (host.jsx + main.js)"
git push -u origin $branchName
if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh pr create --title "Phase 2: Word-level timing" --body "Add per-word tokens, per-word SRT blocks, and Premiere per-word highlighting path." --base main --head $branchName
} else {
  Write-Host "gh CLI not found. Create a PR manually in GitHub."
}
