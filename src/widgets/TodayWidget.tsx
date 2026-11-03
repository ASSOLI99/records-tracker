// Android home-screen widget: active journeys with their streak and today's step.
//
// The layout below is serialised by the 'widget' directive and runs in the widget's own JS
// runtime, not the app's. Inside it, use only its arguments, the @expo/ui components and
// modifiers, and plain JavaScript. This file must not import app modules (it is also bundled
// on its own at build time to give the widget a layout before the app first opens).
import { Column, LinearProgressIndicator, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, padding, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type TodayWidgetPlan = {
  name: string;
  /** e.g. "🔥 12" */
  streak: string;
  /** e.g. "Done", "60%", "To do" */
  label: string;
  /** 0–1 */
  progress: number;
  color: string;
  done: boolean;
};

export type TodayWidgetProps = {
  title: string;
  empty: string;
  updated: string;
  plans: TodayWidgetPlan[];
};

const TodayLayout = (props: TodayWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const bg = dark ? '#16182c' : '#ffffff';
  const fg = dark ? '#f4f5ff' : '#1b2133';
  const dim = dark ? '#9aa0c3' : '#6b7489';
  const track = dark ? '#2a2d48' : '#e3e7f0';
  const ok = '#22c55e';
  const plans = props.plans.slice(0, 4);
  return (
    <Column modifiers={[fillMaxSize(), cornerRadius(22), background(bg), paddingAll(14)]}>
      <Text color="#7c4dff" style={{ fontSize: 13, fontWeight: '800' }} maxLines={1}>
        {props.title}
      </Text>
      <Spacer modifiers={[height(8)]} />
      {plans.length === 0 ? (
        <Text color={dim} style={{ fontSize: 13 }}>
          {props.empty}
        </Text>
      ) : null}
      {plans.map((p, i) => (
        <Column key={String(i)} modifiers={[fillMaxWidth(), padding(0, 0, 0, 8)]}>
          <Row modifiers={[fillMaxWidth()]}>
            <Text color={fg} style={{ fontSize: 14, fontWeight: '700' }} maxLines={1}>
              {p.streak + '  ' + p.name}
            </Text>
          </Row>
          <Row modifiers={[fillMaxWidth(), padding(0, 4, 0, 0)]}>
            <Text color={p.done ? ok : dim} style={{ fontSize: 12, fontWeight: '600' }} maxLines={1}>
              {p.label}
            </Text>
          </Row>
          <LinearProgressIndicator progress={p.progress} color={p.done ? ok : p.color} trackColor={track} modifiers={[fillMaxWidth(), height(5), padding(0, 4, 0, 0)]} />
        </Column>
      ))}
      <Text color={dim} style={{ fontSize: 10 }} maxLines={1}>
        {props.updated}
      </Text>
    </Column>
  );
};

export const TodayWidget = createWidget<TodayWidgetProps>('Today', TodayLayout, {
  title: 'Records Tracker',
  empty: 'Open the app to see your journeys · افتح التطبيق لترى رحلاتك',
  updated: '',
  plans: [],
});
