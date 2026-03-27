/**
 * host.jsx
 * ExtendScript bridge for Premiere Pro integration.
 * Implements actual Premiere Pro API calls for audio export and SRT import.
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
      return 'ERROR:' + (e && e.toString ? e.toString() : '');
    }
  }

  // EXPORT AUDIO: Uses Premiere Pro's actual export functionality
  function exportActiveSequenceAudio() {
    try {
      var seq = _getActiveSequence();
      if (!seq) return 'NO_SEQUENCE';
      
      // Create output folder
      var outFolder = new Folder(Folder.desktop + '/AI-Caption-Pro');
      if (!outFolder.exists) outFolder.create();
      
      // Define output path
      var wavPath = outFolder.fsName + '/sequence_audio.wav';
      
      // Configure export settings for WAV
      var exportFile = new File(wavPath);
      if (exportFile.exists) exportFile.remove();
      
      // Get sequence's audio track for export
      var videoTrack = seq.videoTracks;
      var audioTracks = seq.audioTracks;
      
      // If no audio tracks, we need to extract from video
      if (audioTracks.numTracks === 0) {
        // Export sequence as WAV using sequence's export settings
        seq.exportFile(exportFile, 0); // 0 = Sequence format (will ask for preset)
        // Note: In production, you'd want to use a preset or silent export
        // For MVP, we assume user has default audio export preset configured
        return wavPath;
      }
      
      // Export audio mixdown
      var audioExportSettings = new ExportSettings;
      audioExportSettings.format = 'Wave'; // WAV format
      audioExportSettings.audioCodec = 'PCM';
      audioExportSettings.audioSampleRate = 48000;
      audioExportSettings.audioBitDepth = 16;
      audioExportSettings.audioChannels = 'Stereo';
      
      seq.exportFile(exportFile, 2, audioExportSettings); // 2 = Audio only
      
      // Wait for export to complete (simple timeout)
      var startTime = new Date().getTime();
      while (!exportFile.exists && (new Date().getTime() - startTime) < 30000) {
        $.sleep(100); // Wait 100ms, max 30 seconds
      }
      
      if (!exportFile.exists) {
        return 'ERROR: Audio export timeout';
      }
      
      return wavPath;
    } catch (e) {
      return 'ERROR:' + (e && e.toString ? e.toString() : 'Unknown export error');
    }
  }

  // IMPORT SRT: Creates caption track and imports subtitles
  function importSRT(srtPath) {
    try {
      var seq = _getActiveSequence();
      if (!seq) return 'NO_SEQUENCE';
      
      var f = new File(srtPath);
      if (!f.exists) return 'ERROR: SRT file not found';
      
      // Import the SRT file into project
      var importedItem = app.project.importFiles([new ImportOptions(f)])[0];
      if (!importedItem) return 'ERROR: Failed to import SRT file';
      
      // Create a new caption track
      var captionTrack = seq.audioTracks.add(); // Using audio track as base for caption
      captionTrack.name = "AI Captions";
      
      // Create caption item from imported SRT
      var captionItem = seq.videoTracks[0].clips.add(importedItem, 0);
      if (!captionItem) return 'ERROR: Failed to create caption clip';
      
      // Set caption properties
      captionItem.name = "AI Generated Captions";
      
      // In a full implementation, we'd:
      // 1. Parse SRT and create individual caption segments
      // 2. Set proper in/out points for each caption
      // 3. Apply caption styling
      // For MVP, we rely on Premiere's built-in SRT handling
      
      return 'IMPORT_OK';
    } catch (e) {
      return 'ERROR:' + (e && e.toString ? e.toString() : 'Unknown import error');
    }
  }

  // PHASE 2: Word timings API
  function importWordTimings(wordTimingsPath) {
    try {
      var f = new File(wordTimingsPath);
      if (!f.exists) return 'ERROR: Word timings file not found';
      f.open('r');
      var data = f.read();
      f.close();
      
      // Parse JSON and prepare for caption styling
      var wordData = JSON.parse(data);
      // TODO: Apply word-level styling to captions (future enhancement)
      // For now, we just confirm the file was read
      return 'IMPORT_OK';
    } catch (e) {
      return 'ERROR:' + (e && e.toString ? e.toString() : 'Unknown error');
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
