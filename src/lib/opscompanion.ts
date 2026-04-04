import { Platform } from 'react-native';

import { env } from './env';

const OTEL_BASE_URL = 'https://otel.opscompanion.ai/v1';
const SERVICE_NAME = 'podium-mobile';
const APP_ENVIRONMENT = __DEV__ ? 'development' : 'production';
const APP_VERSION = '1.0.0';

type Primitive = string | number | boolean | null | undefined;
type AttributeValue = Primitive | Primitive[];

type TelemetryAttributes = Record<string, AttributeValue>;
type OtlpAnyValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean }
  | { arrayValue: { values: OtlpAnyValue[] } };

type LogSeverity =
  | 'TRACE'
  | 'DEBUG'
  | 'INFO'
  | 'WARN'
  | 'ERROR'
  | 'FATAL';

type TraceStatus = 'ok' | 'error';

type LogInput = {
  eventName: string;
  body?: unknown;
  severity?: LogSeverity;
  attributes?: TelemetryAttributes;
};

type TraceInput = {
  name: string;
  startTimeMs?: number;
  endTimeMs?: number;
  attributes?: TelemetryAttributes;
  status?: TraceStatus;
};

function isTelemetryEnabled() {
  return Boolean(env.opsCompanionApiKey);
}

function toAttributeValue(value: AttributeValue): OtlpAnyValue {
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toAttributeValue(item)),
      },
    };
  }

  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { intValue: value.toString() }
      : { doubleValue: value };
  }
  if (typeof value === 'boolean') return { boolValue: value };

  return { stringValue: '' };
}

function normalizeAttributes(attributes?: TelemetryAttributes) {
  const merged: TelemetryAttributes = {
    'service.name': SERVICE_NAME,
    'deployment.environment': APP_ENVIRONMENT,
    'service.version': APP_VERSION,
    'device.platform': Platform.OS,
    ...attributes,
  };

  return Object.entries(merged)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      value: toAttributeValue(value),
    }));
}

function encodeBody(body: unknown) {
  if (body == null) return { stringValue: '' };
  if (typeof body === 'string') return { stringValue: body };
  if (typeof body === 'number') {
    return Number.isInteger(body)
      ? { intValue: body.toString() }
      : { doubleValue: body };
  }
  if (typeof body === 'boolean') return { boolValue: body };

  try {
    return { stringValue: JSON.stringify(body) };
  } catch {
    return { stringValue: '[unserializable]' };
  }
}

function nowUnixNano(ms = Date.now()) {
  return (BigInt(ms) * 1000000n).toString();
}

function randomHex(bytes: number) {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join('');
}

async function postOtlp(path: 'logs' | 'traces', payload: unknown) {
  if (!isTelemetryEnabled()) return;

  try {
    await fetch(`${OTEL_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.opsCompanionApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Telemetry should never break app flows.
  }
}

const severityNumberMap: Record<LogSeverity, number> = {
  TRACE: 1,
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21,
};

export function trackLog({ eventName, body, severity = 'INFO', attributes }: LogInput) {
  return postOtlp('logs', {
    resourceLogs: [
      {
        resource: {
          attributes: normalizeAttributes(attributes),
        },
        scopeLogs: [
          {
            scope: { name: SERVICE_NAME },
            logRecords: [
              {
                timeUnixNano: nowUnixNano(),
                observedTimeUnixNano: nowUnixNano(),
                severityText: severity,
                severityNumber: severityNumberMap[severity],
                eventName,
                body: encodeBody(body),
                attributes: normalizeAttributes(attributes),
              },
            ],
          },
        ],
      },
    ],
  });
}

export function trackTrace({
  name,
  startTimeMs = Date.now(),
  endTimeMs = Date.now(),
  attributes,
  status = 'ok',
}: TraceInput) {
  return postOtlp('traces', {
    resourceSpans: [
      {
        resource: {
          attributes: normalizeAttributes(attributes),
        },
        scopeSpans: [
          {
            scope: { name: SERVICE_NAME },
            spans: [
              {
                traceId: randomHex(16),
                spanId: randomHex(8),
                name,
                kind: 1,
                startTimeUnixNano: nowUnixNano(startTimeMs),
                endTimeUnixNano: nowUnixNano(endTimeMs),
                attributes: normalizeAttributes(attributes),
                status: { code: status === 'ok' ? 1 : 2 },
              },
            ],
          },
        ],
      },
    ],
  });
}

export async function withTrace<T>(
  name: string,
  attributes: TelemetryAttributes,
  work: () => Promise<T>,
) {
  const startTimeMs = Date.now();

  try {
    const result = await work();
    await trackTrace({
      name,
      startTimeMs,
      endTimeMs: Date.now(),
      attributes,
      status: 'ok',
    });
    return result;
  } catch (error) {
    await trackTrace({
      name,
      startTimeMs,
      endTimeMs: Date.now(),
      attributes: {
        ...attributes,
        'error.message': error instanceof Error ? error.message : String(error),
      },
      status: 'error',
    });
    throw error;
  }
}
