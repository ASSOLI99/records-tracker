import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { Plan } from '@/model/types';
import { computePeriods, currentTrigger } from '@/model/periods';
import { streak } from '@/model/progress';
import { shortDate, triggerSummary } from '@/model/labels';
import { describeRoot } from '@/storage/fs';
import { useApp } from '@/state/app';
import { getTheme } from '@/themes/themes';
import { Btn, Card, Icon, IconBtn, Row, Txt } from '@/ui/kit';
import { Screen } from '@/ui/overlays';
import { alpha, useTheme } from '@/ui/theme';

function PlanCard({ plan }: { plan: Plan }) {
  const { t, lang } = useApp();
  const th = getTheme(plan.themeId);
  const c = th.colors;
  const stats = useMemo(() => {
    const periods = computePeriods(plan);
    return { steps: periods.length, streak: streak(plan, periods).current };
  }, [plan]);
  const goalsDone = plan.goals.filter((g) => g.completed).length;
  const headingStyle = {
    color: c.text,
    fontFamily: th.font.heading,
    fontWeight: th.headingWeight,
    fontStyle: th.headingItalic ? ('italic' as const) : ('normal' as const),
    textTransform: th.uppercase ? ('uppercase' as const) : ('none' as const),
    letterSpacing: th.letterSpacing,
  };
  const meta = (icon: string, label: string, color = c.textDim) => (
    <Row gap={4}>
      <Icon name={icon} size={15} color={color} />
      <Text style={{ color, fontSize: 12, fontFamily: th.font.body, fontWeight: '600' }}>{label}</Text>
    </Row>
  );
  return (
    <Pressable onPress={() => router.push(`/plan/${plan.id}`)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <LinearGradient colors={[c.bg, c.bg2]} style={{ borderRadius: Math.max(th.radius, 12), borderWidth: th.borderWidth, borderColor: c.border, padding: 16, gap: 10 }}>
        <Row>
          <View style={{ width: 44, height: 44, borderRadius: th.node === 'circle' ? 22 : th.radius, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={plan.finishedAt ? th.finishIcon : plan.icon || th.heroIcon} size={24} color={c.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[headingStyle, { fontSize: 18 }]}>
              {plan.name}
            </Text>
            <Text numberOfLines={1} style={{ color: c.textDim, fontSize: 12, fontFamily: th.font.body }}>
              {th.name[lang]} · {triggerSummary(currentTrigger(plan), lang, t)}
            </Text>
          </View>
          {!plan.finishedAt && stats.streak > 0 ? (
            <View style={{ alignItems: 'center' }}>
              <Icon name={th.streakIcon} size={22} color={c.accent} />
              <Text style={{ color: c.accent, fontWeight: '900', fontSize: 14 }}>{stats.streak}</Text>
            </View>
          ) : null}
        </Row>
        <Row gap={14} wrap>
          {meta('stairs', stats.steps === 1 ? t('home.oneStep') : t('home.steps', { n: stats.steps }))}
          {plan.goals.length ? meta('flag-checkered', t('home.goals', { done: goalsDone, total: plan.goals.length })) : null}
          {plan.finishedAt ? meta('trophy', t('home.completedOn', { date: shortDate(new Date(plan.finishedAt), lang) }), c.success) : null}
        </Row>
      </LinearGradient>
    </Pressable>
  );
}

export default function Home() {
  const th = useTheme();
  const { phase, me, plans, t, root } = useApp();

  if (phase === 'loading')
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.bg }}>
        <ActivityIndicator color={th.colors.primary} size="large" />
      </View>
    );
  if (phase !== 'ready' || !me) return <Redirect href="/onboarding" />;

  const active = plans.filter((p) => !p.finishedAt);
  const finished = plans.filter((p) => p.finishedAt);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.push('/me')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: th.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Txt variant="h2" color={th.colors.onPrimary}>
              {me.name.trim().charAt(0).toUpperCase()}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h2" numberOfLines={1}>
              {t('home.hello', { name: me.name })}
            </Txt>
            <Txt variant="small" dim>
              {t('home.subtitle')}
            </Txt>
          </View>
        </Pressable>
        <IconBtn name="cog-outline" onPress={() => router.push('/me')} label={t('settings.title')} />
      </Row>

      <Pressable onPress={() => router.push('/plan/new')} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
        <LinearGradient
          colors={[th.colors.primary, '#7c4dff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 20, gap: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Txt variant="h2" color="#fff">
              {t('home.newPlan')}
            </Txt>
            <Txt variant="small" color={alpha('#ffffff', 0.85)}>
              {t('home.newPlanSub')}
            </Txt>
          </View>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: alpha('#ffffff', 0.22), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={30} color="#fff" />
          </View>
        </LinearGradient>
      </Pressable>

      <View style={{ gap: 12 }}>
        <Txt variant="h3">{t('home.active')}</Txt>
        {active.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <Icon name="map-marker-path" size={40} color={th.colors.textDim} />
            <Txt dim center>
              {t('home.empty')}
            </Txt>
            <Btn small label={t('home.newPlan')} onPress={() => router.push('/plan/new')} />
          </Card>
        ) : (
          active.map((p) => <PlanCard key={p.id} plan={p} />)
        )}
      </View>

      {finished.length ? (
        <View style={{ gap: 12 }}>
          <Txt variant="h3">{t('home.finished')}</Txt>
          {finished.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </View>
      ) : null}

      <Row gap={6} style={{ opacity: 0.8 }}>
        <Icon name="folder-outline" size={16} color={th.colors.textDim} />
        <Txt variant="tiny" dim style={{ flex: 1 }}>
          {t('home.storageHint', { path: describeRoot(root, t) })}
        </Txt>
      </Row>
    </Screen>
  );
}
