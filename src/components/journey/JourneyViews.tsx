import { memo, useMemo } from 'react';
import { FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { TFn } from '@/i18n';
import type { JourneyItem } from '@/model/journey';
import type { JourneyEvent, Plan } from '@/model/types';
import { dateTime, shortDate, stepTitle } from '@/model/labels';
import { useApp } from '@/state/app';
import { Icon, ProgressBar, Txt } from '@/ui/kit';
import { alpha, useTheme } from '@/ui/theme';
import { NodeShape } from '../NodeShape';
import { StepBadges } from './StepBadges';
import { StepNode, nodeState } from './StepNode';

export interface JourneyViewProps {
  plan: Plan;
  items: JourneyItem[];
  endReached: boolean;
  totalSteps: number | null;
  onOpenStep: (key: string) => void;
  onFinish: () => void;
  topInset: number;
  bottomInset: number;
}

export function eventText(e: JourneyEvent, t: TFn): string {
  switch (e.kind) {
    case 'status':
      return t('event.status', { name: e.title, from: e.from ?? '—', to: e.to ?? '—' });
    case 'goal':
      return t('goals.achieved', { name: e.title });
    case 'template':
      return t('template.changed');
    case 'trigger':
      return t('trigger.changed', { name: e.title });
  }
}

export function eventIcon(e: JourneyEvent): string {
  if (e.icon) return e.icon;
  return e.kind === 'status' ? 'swap-vertical' : e.kind === 'goal' ? 'trophy-outline' : e.kind === 'trigger' ? 'tune-variant' : 'file-document-edit-outline';
}

// ---------------------------------------------------------------- Map

const H = { step: 138, event: 74, finish: 170, start: 120 } as const;
const heightOf = (it: JourneyItem) => H[it.type];

function xFracForStep(index: number): number {
  return 0.5 + 0.27 * Math.sin(index * 0.85);
}

function EventBubble({ event, side }: { event: JourneyEvent; side: 'left' | 'right' }) {
  const th = useTheme();
  const { t, lang } = useApp();
  return (
    <View
      style={{
        position: 'absolute',
        top: 14,
        [side]: 14,
        maxWidth: '58%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: Math.max(th.radius, 10),
        backgroundColor: alpha(th.colors.surface, 0.95),
        borderWidth: th.borderWidth,
        borderColor: event.kind === 'goal' ? th.colors.success : th.colors.accent,
      }}
    >
      <Icon name={eventIcon(event)} size={18} color={event.kind === 'goal' ? th.colors.success : th.colors.accent} />
      <View style={{ flexShrink: 1 }}>
        <Txt variant="tiny" numberOfLines={2} style={{ fontWeight: '700' }}>
          {eventText(event, t)}
        </Txt>
        <Txt variant="tiny" dim>
          {dateTime(new Date(event.at), lang)}
        </Txt>
      </View>
    </View>
  );
}

const MapRow = memo(function MapRow({
  item,
  width,
  cx,
  topX,
  botX,
  topFuture,
  bottomFuture,
  plan,
  props,
}: {
  item: JourneyItem;
  width: number;
  cx: number;
  topX: number | null;
  botX: number | null;
  topFuture: boolean;
  bottomFuture: boolean;
  plan: Plan;
  props: JourneyViewProps;
}) {
  const th = useTheme();
  const c = th.colors;
  const { t, lang } = useApp();
  const h = heightOf(item);
  const mid = h / 2;
  const top = topX != null ? `M ${topX} 0 C ${topX} ${h * 0.25}, ${cx} ${h * 0.25}, ${cx} ${mid}` : null;
  const bottom = botX != null ? `M ${cx} ${mid} C ${cx} ${h * 0.75}, ${botX} ${h * 0.75}, ${botX} ${h}` : null;
  const dash = th.pathDash ?? undefined;
  const labelOnLeft = cx > width / 2;
  const decor = th.decor.length && item.type === 'step' && item.period.index % 3 === 0 ? th.decor[item.period.index % th.decor.length] : null;

  const path = (
    <Svg width={width} height={h} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {top ? <Path d={top} stroke={topFuture ? c.missed : c.path} strokeWidth={th.pathWidth} strokeDasharray={dash} strokeLinecap="round" fill="none" /> : null}
      {bottom ? <Path d={bottom} stroke={bottomFuture ? c.missed : c.path} strokeWidth={th.pathWidth} strokeDasharray={dash} strokeLinecap="round" fill="none" /> : null}
    </Svg>
  );

  if (item.type === 'step') {
    const state = nodeState(item.summary, item.current);
    const size = item.current ? 72 : 60;
    return (
      <Pressable onPress={() => props.onOpenStep(item.key)} style={{ height: h, width }}>
        {path}
        {decor ? (
          <View style={{ position: 'absolute', top: mid - 20, [labelOnLeft ? 'right' : 'left']: 8, opacity: 0.18 }} pointerEvents="none">
            <Icon name={decor} size={40} color={c.text} />
          </View>
        ) : null}
        <View style={{ position: 'absolute', left: cx - size / 2, top: mid - size / 2 }}>
          <StepNode index={item.period.index} state={state} size={size} />
        </View>
        <View
          style={{
            position: 'absolute',
            top: mid - 30,
            ...(labelOnLeft ? { right: width - cx + size / 2 + 10 } : { left: cx + size / 2 + 10 }),
            maxWidth: width / 2 - size / 2 - 24,
            alignItems: labelOnLeft ? 'flex-end' : 'flex-start',
            gap: 4,
          }}
        >
          {item.current ? (
            <View style={{ backgroundColor: c.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: c.onPrimary, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>{t('journey.now')}</Text>
            </View>
          ) : null}
          <Txt variant="small" numberOfLines={1} style={{ fontWeight: '800' }}>
            {stepTitle(item.period, lang, t)}
          </Txt>
          <Txt variant="tiny" dim>
            {props.totalSteps ? t('journey.stepOf', { n: item.period.index, total: props.totalSteps }) : t('journey.step', { n: item.period.index })}
          </Txt>
          <StepBadges summary={item.summary} compact />
        </View>
      </Pressable>
    );
  }

  if (item.type === 'event') {
    return (
      <View style={{ height: h, width }}>
        {path}
        <View style={{ position: 'absolute', left: cx - 7, top: mid - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: c.accent, borderWidth: 2, borderColor: c.surface }} />
        <EventBubble event={item.event} side={labelOnLeft ? 'left' : 'right'} />
      </View>
    );
  }

  if (item.type === 'finish') {
    const finished = !!plan.finishedAt;
    const size = 92;
    return (
      <Pressable onPress={finished ? undefined : props.onFinish} style={{ height: h, width }}>
        {path}
        <View style={{ position: 'absolute', left: cx - size / 2, top: mid - size / 2 }}>
          <NodeShape shape={th.node} size={size} fill={finished ? c.success : props.endReached ? c.accent : c.surface} stroke={finished ? c.success : c.accent} strokeWidth={3} glow={th.glow || props.endReached ? c.accent : null}>
            <Icon name={finished ? th.finishIcon : 'flag-checkered'} size={42} color={finished || props.endReached ? c.onPrimary : c.accent} />
          </NodeShape>
        </View>
        <View style={{ position: 'absolute', top: mid + size / 2 + 4, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, backgroundColor: alpha(c.bg, 0.9) }}>
          <Txt variant="h3" center>
            {finished ? t('journey.finished') : t('journey.finishLine')}
          </Txt>
          <Txt variant="tiny" dim center>
            {finished ? t('journey.finishedOn', { date: shortDate(new Date(plan.finishedAt!), lang) }) : props.endReached ? t('journey.endReached') : t('journey.finishTap')}
          </Txt>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ height: h, width }}>
      {path}
      <View style={{ position: 'absolute', left: cx - 22, top: mid - 22, width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface2, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="flag-variant-outline" size={22} color={c.textDim} />
      </View>
      <View style={{ position: 'absolute', top: mid + 26, left: 0, right: 0 }}>
        <Txt variant="tiny" dim center>
          {t('journey.start')} · {shortDate(new Date(item.at), lang)}
        </Txt>
      </View>
    </View>
  );
});

/** Game-style chapter map: a winding path, newest step at the top, finish line above it. */
export function JourneyMap(props: JourneyViewProps) {
  const { width } = useWindowDimensions();
  const { items, plan } = props;

  const geo = useMemo(() => {
    const cxs: number[] = items.map((it) => (it.type === 'step' ? width * xFracForStep(it.period.index) : NaN));
    // Events sit on the path between their neighbouring steps; finish/start sit centred.
    for (let i = 0; i < items.length; i++) {
      if (!Number.isNaN(cxs[i])) continue;
      if (items[i].type === 'finish' || items[i].type === 'start') {
        cxs[i] = width / 2;
        continue;
      }
      const below = cxs.slice(i + 1).find((x) => !Number.isNaN(x));
      cxs[i] = below ?? width / 2;
    }
    const offsets: number[] = [];
    let acc = 0;
    for (const it of items) {
      offsets.push(acc);
      acc += heightOf(it);
    }
    return { cxs, offsets };
  }, [items, width]);

  return (
    // The map is drawn with absolute x positions, so it is laid out LTR in both languages.
    <FlatList
      style={{ direction: 'ltr' }}
      data={items}
      keyExtractor={(it) => it.key}
      contentContainerStyle={{ paddingTop: props.topInset, paddingBottom: props.bottomInset }}
      getItemLayout={(_, index) => ({ length: heightOf(items[index]), offset: geo.offsets[index], index })}
      initialNumToRender={10}
      windowSize={9}
      renderItem={({ item, index }) => {
        const cx = geo.cxs[index];
        const prev = index > 0 ? geo.cxs[index - 1] : null;
        const next = index < items.length - 1 ? geo.cxs[index + 1] : null;
        return (
          <MapRow
            item={item}
            width={width}
            cx={cx}
            topX={prev != null ? (prev + cx) / 2 : null}
            botX={next != null ? (next + cx) / 2 : null}
            topFuture={index === 1 && !plan.finishedAt}
            bottomFuture={index === 0 && !plan.finishedAt}
            plan={plan}
            props={props}
          />
        );
      }}
    />
  );
}

// ---------------------------------------------------------------- Cards

type CardRow = { key: string; kind: 'pair'; items: Extract<JourneyItem, { type: 'step' }>[] } | { key: string; kind: 'single'; item: JourneyItem };

function StepCard({ item, props }: { item: Extract<JourneyItem, { type: 'step' }>; props: JourneyViewProps }) {
  const th = useTheme();
  const c = th.colors;
  const { t, lang } = useApp();
  const state = nodeState(item.summary, item.current);
  return (
    <Pressable
      onPress={() => props.onOpenStep(item.key)}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 150,
        padding: 12,
        gap: 8,
        borderRadius: th.radius,
        backgroundColor: state === 'done' ? alpha(c.primary, 0.16) : c.surface,
        borderWidth: item.current ? 2 : th.borderWidth,
        borderColor: item.current ? c.accent : c.border,
        opacity: pressed ? 0.85 : state === 'missed' ? 0.65 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <StepNode index={item.period.index} state={state} size={36} />
        {item.current ? (
          <View style={{ backgroundColor: c.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: c.onPrimary, fontWeight: '900', fontSize: 9 }}>{t('journey.now')}</Text>
          </View>
        ) : null}
      </View>
      <Txt variant="small" numberOfLines={2} style={{ fontWeight: '800' }}>
        {stepTitle(item.period, lang, t)}
      </Txt>
      <StepBadges summary={item.summary} compact />
      <View style={{ flex: 1 }} />
      {item.summary.overall != null ? <ProgressBar value={item.summary.overall / 100} color={item.summary.overall >= 100 ? c.success : c.primary} /> : null}
    </Pressable>
  );
}

function EventCard({ event }: { event: JourneyEvent }) {
  const th = useTheme();
  const { t, lang } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: th.radius, borderWidth: 1, borderStyle: 'dashed', borderColor: th.colors.accent }}>
      <Icon name={eventIcon(event)} size={20} color={event.kind === 'goal' ? th.colors.success : th.colors.accent} />
      <Txt variant="small" style={{ flex: 1, fontWeight: '700' }}>
        {eventText(event, t)}
      </Txt>
      <Txt variant="tiny" dim>
        {dateTime(new Date(event.at), lang)}
      </Txt>
    </View>
  );
}

function FinishCard({ props }: { props: JourneyViewProps }) {
  const th = useTheme();
  const { t, lang } = useApp();
  const finished = !!props.plan.finishedAt;
  return (
    <Pressable
      onPress={finished ? undefined : props.onFinish}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: th.radius, backgroundColor: finished ? alpha(th.colors.success, 0.18) : props.endReached ? alpha(th.colors.accent, 0.2) : th.colors.surface, borderWidth: th.borderWidth, borderColor: finished ? th.colors.success : th.colors.accent }}
    >
      <Icon name={finished ? th.finishIcon : 'flag-checkered'} size={30} color={finished ? th.colors.success : th.colors.accent} />
      <View style={{ flex: 1 }}>
        <Txt variant="h3">{finished ? t('journey.finished') : t('journey.finishLine')}</Txt>
        <Txt variant="tiny" dim>
          {finished ? t('journey.finishedOn', { date: shortDate(new Date(props.plan.finishedAt!), lang) }) : props.endReached ? t('journey.endReached') : t('journey.finishTap')}
        </Txt>
      </View>
    </Pressable>
  );
}

export function JourneyCards(props: JourneyViewProps) {
  const { t, lang } = useApp();
  const rows = useMemo(() => {
    const out: CardRow[] = [];
    let pair: Extract<JourneyItem, { type: 'step' }>[] = [];
    const flush = () => {
      if (pair.length) out.push({ key: `pair:${pair[0].key}`, kind: 'pair', items: pair });
      pair = [];
    };
    for (const it of props.items) {
      if (it.type === 'step') {
        pair.push(it);
        if (pair.length === 2) flush();
      } else {
        flush();
        out.push({ key: it.key, kind: 'single', item: it });
      }
    }
    flush();
    return out;
  }, [props.items]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.key}
      // Start padding leaves room for the goals tab on the start edge.
      contentContainerStyle={{ paddingTop: props.topInset, paddingBottom: props.bottomInset, paddingStart: 44, paddingEnd: 14, gap: 10 }}
      renderItem={({ item: row }) => {
        if (row.kind === 'pair')
          return (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {row.items.map((s) => (
                <StepCard key={s.key} item={s} props={props} />
              ))}
              {row.items.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          );
        const it = row.item;
        if (it.type === 'event') return <EventCard event={it.event} />;
        if (it.type === 'finish') return <FinishCard props={props} />;
        if (it.type === 'start')
          return (
            <Txt variant="tiny" dim center>
              {t('journey.start')} · {shortDate(new Date(it.at), lang)}
            </Txt>
          );
        return null;
      }}
    />
  );
}

// ---------------------------------------------------------------- Timeline

export function JourneyTimeline(props: JourneyViewProps) {
  const th = useTheme();
  const c = th.colors;
  const { t, lang } = useApp();
  return (
    <FlatList
      data={props.items}
      keyExtractor={(it) => it.key}
      contentContainerStyle={{ paddingTop: props.topInset, paddingBottom: props.bottomInset, paddingStart: 40, paddingEnd: 14 }}
      renderItem={({ item, index }) => {
        const rail = (
          <View style={{ width: 40, alignItems: 'center' }}>
            <View style={{ position: 'absolute', top: index === 0 ? '50%' : 0, bottom: index === props.items.length - 1 ? '50%' : 0, width: 3, backgroundColor: c.path, borderRadius: 2 }} />
          </View>
        );
        if (item.type === 'finish')
          return (
            <View style={{ flexDirection: 'row', minHeight: 76, alignItems: 'center' }}>
              {rail}
              <View style={{ flex: 1, paddingVertical: 6 }}>
                <FinishCard props={props} />
              </View>
            </View>
          );
        if (item.type === 'start')
          return (
            <View style={{ flexDirection: 'row', minHeight: 50, alignItems: 'center' }}>
              {rail}
              <Txt variant="tiny" dim>
                {t('journey.start')} · {shortDate(new Date(item.at), lang)}
              </Txt>
            </View>
          );
        if (item.type === 'event')
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56 }}>
              {rail}
              <View style={{ flex: 1, paddingVertical: 4 }}>
                <EventCard event={item.event} />
              </View>
            </View>
          );
        const state = nodeState(item.summary, item.current);
        return (
          <Pressable onPress={() => props.onOpenStep(item.key)} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 84 }}>
            <View style={{ width: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: c.path, borderRadius: 2 }} />
              <StepNode index={item.period.index} state={state} size={34} />
            </View>
            <View
              style={{
                flex: 1,
                marginVertical: 6,
                padding: 12,
                gap: 6,
                borderRadius: th.radius,
                backgroundColor: c.surface,
                borderWidth: item.current ? 2 : th.borderWidth,
                borderColor: item.current ? c.accent : c.border,
                opacity: state === 'missed' ? 0.65 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt variant="small" style={{ fontWeight: '800', flex: 1 }} numberOfLines={1}>
                  {stepTitle(item.period, lang, t)}
                </Txt>
                <Txt variant="tiny" dim>
                  {props.totalSteps ? t('journey.stepOf', { n: item.period.index, total: props.totalSteps }) : t('journey.step', { n: item.period.index })}
                </Txt>
              </View>
              <StepBadges summary={item.summary} compact />
              {item.summary.overall != null ? <ProgressBar value={item.summary.overall / 100} color={item.summary.overall >= 100 ? c.success : c.primary} height={5} /> : null}
            </View>
          </Pressable>
        );
      }}
    />
  );
}
