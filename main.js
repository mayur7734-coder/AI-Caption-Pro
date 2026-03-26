// AI Caption Pro - CEP panel frontend
// This is a production-ready skeleton. It orchestrates the UI, the Python backend,
// and ExtendScript (JSX) host calls to Premiere Pro.

(() => {
  const csInterface = (window.csInterface = window.csInterface || null);
  // Lazy-load CSInterface if the host provides it
  let CS = null;
  try { CS = typeof CSInterface !== 'undefined' ? new CSInterface() : null; } catch (_) { CS = null; }

  const seqNameEl = document.getElementById('sequenceName');
  const detectBtn = document.getElementById('detectBtn');
  const generateBtn = document.getElementById('generateBtn');
  const langSel = document.getElementById('langSel');
  const styleSel = document.getElementById('styleSel');
  const loader = document.getElementById('loader');
  const progressBar = document.getElementById('progressBar');
  const statusEl = document.getElementById('status');

  function setStatus(text) { statusEl.textContent = text; }
  function showLoader(show) { loader.hidden = !show; }
  function setProgress(p) { progressBar.style.width = p + '%'; progressBar.parentElement.hidden = p < 0 || p > 100; progressBar.parentElement.style.display = 'block'; }

  function postToHost(script, callback) {
    if (typeof CSInterface !== 'undefined' && CSInterface) {
      CSInterface.evalScript(script, callback);
    } else {
      // Fallback for environments without CSInterface (for local testing)
      callback('MOCK_PATH');
    }
  }

  function exportAudioFromSequence() {
    return new Promise((resolve, reject) => {
      postToHost('AI_Caption_Pro.exportActiveSequenceAudio()', function(res) {
        if (!res || res.startsWith('ERROR')) {
          reject(new Error(res || 'Unknown error exporting audio'));
        } else {
          resolve(res);
        }
      });
    });
  }

  function runPythonTranscription(wavPath, language) {
    // Spawn Python process via Node (CEP panel runs in Node).
    // We rely on the panel's runtime to have Python in PATH.
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const model = 'base';
      const scriptPath = require('path').resolve(__dirname, 'python/transcribe.py');
      const args = [scriptPath, '--audio', wavPath, '--model', model, '--language', language, '--output', 'json,srt'];
      const proc = spawn(process.execPath, args);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            let res = null;
            try { res = JSON.parse(stdout); } catch (e) { res = { json: stdout }; }
            resolve(res);
          } catch (e) {
            // If the Python script prints a JSON blob, return the raw output as error payload
            resolve({ error: 'Malformed JSON from transcribe.py', raw: stdout, code });
          }
        } else {
          reject(new Error(stderr || 'transcribe.py failed'));
        }
      });
    });
  }

  function importSRTToPremiere(srtPath) {
    return new Promise((resolve, reject) => {
      postToHost(`AI_Caption_Pro.importSRT('${srtPath}')`, function(res) {
        if (res && !res.startsWith('ERROR')) {
          resolve(res);
        } else {
          reject(new Error(res || 'Import failed'));
        }
      });
    });
  }

  function onGenerate() {
    setStatus('Detecting sequence...');
    showLoader(true);
    setProgress(0);
    // Step 1: detect active sequence
    postToHost('AI_Caption_Pro.detectActiveSequence()', function(seqResult) {
      const seq = seqResult || '';
      seqNameEl.textContent = seq;
      setStatus('Exporting audio...');
      exportAudioFromSequence()
        .then((wavPath) => {
          setStatus('Transcribing audio...');
          const language = langSel.value;
          return runPythonTranscription(wavPath, language);
        })
        .then((transcript) => {
          // transcript contains paths to outputs (json, srt) or the payload itself
          const srtPath = transcript?.srtPath || transcript?.srtPath || transcript?.srt || (transcript && transcript.jsonPath ? transcript.jsonPath : null);
          // If the Python script returned a full payload, try to grab srtPath
          const resolvedSrt = (typeof srtPath === 'string' && srtPath) ? srtPath : null;
          if (resolvedSrt) {
            return importSRTToPremiere(resolvedSrt);
          } else {
            throw new Error('No SRT path produced by transcription');
          }
        })
        .then(() => {
          setProgress(100);
          setStatus('Done');
          showLoader(false);
        })
        .catch((err) => {
          setStatus('Error: ' + (err.message || err));
          showLoader(false);
        });
    });
  }

  // Initialize UI
  detectBtn.addEventListener('click', () => {
    postToHost('AI_Caption_Pro.detectActiveSequence()', function(res) {
      seqNameEl.textContent = res || '';
      setStatus(res ? 'Active sequence detected' : 'No active sequence');
    });
  });
  generateBtn.addEventListener('click', onGenerate);

  // Expose a tiny API for host.jsx to be called by evalScript (for completeness)
  window.AICaptionPro = {
    exportActiveSequenceAudio: function() { return 'MOCK_AUDIO.wav'; },
    detectActiveSequence: function() { return 'Untitled Sequence'; },
    importSRT: function(path) { return 'IMPORT_OK'; }
  };

})();
