/**
 * host.jsx
 * ExtendScript bridge for Premiere Pro integration.
 * Exposes AI_Caption_Pro.* methods via a global object for CEP evalScript calls.
 * This MVP skeleton wires to Premiere-like API surface via ExtendScript.
 * Replace placeholder TODOs with actual Premiere ExtendScript API calls as you finalize.
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
      return seq ? seq.name : 'No active sequence';
    } catch (e) {
      return 'ERROR:' + (e && e.toString ? e.toString() : '' );
    }
  }

  // Placeholder: Export active sequence audio to WAV. Replace with real API.
  function exportActiveSequenceAudio() {
    try {
      var seq = _getActiveSequence();
      if (!seq) return 'NO_SEQUENCE';
      var outFolder = new Folder(Folder.desktop + '/AI-Caption-Pro');
      if (!outFolder.exists) outFolder.create();
      var wavPath = outFolder.fsName + '/sequence_audio.wav';
      // TODO: Implement actual export of the audio from `seq` to WAV at wavPath.
      // If Premiere exposes an export function, invoke it here.
      return wavPath;
    } catch (e) {
      return 'ERROR:' + (e && e.toString ? e.toString() : 'Unknown error');
    }
  }

  // Placeholder: Import SRT into the active sequence and attach a caption track.
  function importSRT(srtPath) {
    try {
      var seq = _getActiveSequence();
      if (!seq) return 'NO_SEQUENCE';
      // TODO: Import SRT into Premiere and attach/create a caption track
      return 'IMPORT_OK';
    } catch (e) {
      return 'ERROR:' + (e && e.toString ? e.toString() : 'Unknown error');
    }
  }

  // Word timings API (Phase 2)
  function importWordTimings(wordTimingsPath) {
    try {
      var f = new File(wordTimingsPath);
      if (!f.exists) return 'ERROR: Word timings file not found';
      f.open('r');
      var data = f.read();
      f.close();
      // TODO: parse JSON here and apply timings in Premiere
      return 'IMPORT_OK';
    } catch (e) {
      return 'ERROR:' + (e ? e.toString() : 'Unknown error');
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
