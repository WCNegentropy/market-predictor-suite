import fs from 'node:fs';
import path from 'node:path';
import { appendJsonl, parseJsonl, summarizeFeedbackRecords } from '../models/selfTraining.js';
import { loadState, saveState, statePaths } from './state.js';

function readJsonLike(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return text.split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function normalizeInputFiles(input) {
  return String(input)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function schemaForType(type) {
  if (type === 'prediction') return 'mps.prediction.v1';
  if (type === 'feedback') return 'mps.feedback.v1';
  return null;
}

function recordTargetMatches(record, asset, symbol) {
  const recordAsset = String(record.asset || '').toLowerCase();
  const recordSymbol = String(record.symbol || '').toUpperCase();
  return recordAsset === String(asset).toLowerCase() && recordSymbol === String(symbol).toUpperCase();
}

function dedupeByKey(records, type) {
  const seen = new Set();
  const output = [];
  for (const record of records) {
    const key = type === 'prediction'
      ? `${record.predictionId}|${record.baseTimestamp}|${record.symbol}`
      : `${record.predictionId}|${record.horizon}|${record.scoredAt}|${record.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }
  return output;
}

function validateRecord(record, type, asset, symbol) {
  const expectedSchema = schemaForType(type);
  if (!record || typeof record !== 'object') throw new Error('Record must be an object');
  if (expectedSchema && record.schemaVersion !== expectedSchema) {
    throw new Error(`Record schema ${record.schemaVersion} does not match expected ${expectedSchema}`);
  }
  if (!recordTargetMatches(record, asset, symbol)) {
    throw new Error(`Record target ${record.asset}:${record.symbol} does not match ${asset}:${String(symbol).toUpperCase()}`);
  }
  if (!record.predictionId) throw new Error('Record missing predictionId');
}

function importRecords(targetFile, type, asset, symbol, inputFiles) {
  const existing = parseJsonl(targetFile);
  const incoming = inputFiles.flatMap(readJsonLike);
  for (const record of incoming) validateRecord(record, type, asset, symbol);
  const merged = dedupeByKey([...existing, ...incoming], type);
  const added = merged.length - existing.length;
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, merged.map(record => JSON.stringify(record)).join('\n') + (merged.length ? '\n' : ''));
  return { existingCount: existing.length, importedCount: incoming.length, addedCount: added, totalCount: merged.length };
}

export function rebuildFeedbackState(paths) {
  const state = loadState(paths);
  const predictionLedger = parseJsonl(paths.predictionLedger);
  const feedbackLedger = parseJsonl(paths.feedbackLedger);
  state.feedback = {
    ...summarizeFeedbackRecords(feedbackLedger),
    predictionLedgerCount: predictionLedger.length,
    feedbackLedgerCount: feedbackLedger.length
  };
  saveState(paths, state);
  return { state, predictionLedgerCount: predictionLedger.length, feedbackLedgerCount: feedbackLedger.length, feedbackSummary: state.feedback };
}

export function importPredictionLedger({ stateDir, asset, symbol, input }) {
  const paths = statePaths(stateDir, asset, symbol);
  const result = importRecords(paths.predictionLedger, 'prediction', asset, symbol, normalizeInputFiles(input));
  const rebuilt = rebuildFeedbackState(paths);
  return { paths, ...result, feedbackSummary: rebuilt.feedbackSummary };
}

export function importFeedbackLedger({ stateDir, asset, symbol, input }) {
  const paths = statePaths(stateDir, asset, symbol);
  const result = importRecords(paths.feedbackLedger, 'feedback', asset, symbol, normalizeInputFiles(input));
  const rebuilt = rebuildFeedbackState(paths);
  return { paths, ...result, feedbackSummary: rebuilt.feedbackSummary };
}

export function replayFeedback({ stateDir, asset, symbol }) {
  const paths = statePaths(stateDir, asset, symbol);
  return rebuildFeedbackState(paths);
}
