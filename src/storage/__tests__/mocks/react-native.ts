export const Platform = { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default };
export const I18nManager = { isRTL: false, allowRTL() {}, forceRTL() {} };
