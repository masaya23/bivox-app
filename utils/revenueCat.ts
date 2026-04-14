'use client';

import type { CustomerInfo, PurchasesPackage } from '@revenuecat/purchases-capacitor';

export type RevenueCatTier = 'free' | 'plus' | 'pro';
export type RevenueCatBillingPeriod = 'monthly' | 'annual' | null;

const ANNUAL_KEYWORDS = ['annual', 'yearly'];
const PLUS_DEFAULT_PACKAGE_IDS = new Set(['$rc_monthly', '$rc_annual']);

export interface RevenueCatActiveSubscription {
  productIdentifier: string;
  tier: Exclude<RevenueCatTier, 'free'>;
  billingPeriod: Exclude<RevenueCatBillingPeriod, null>;
  purchaseDate: Date | null;
  expiresAt: Date | null;
}

function normalize(value: string | null | undefined): string {
  return (value || '').toLowerCase();
}

function isAnnualId(value: string | null | undefined): boolean {
  const normalized = normalize(value);
  return ANNUAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getBillingPeriodFromIdentifiers(
  ...values: Array<string | null | undefined>
): Exclude<RevenueCatBillingPeriod, null> {
  return values.some((value) => isAnnualId(value)) ? 'annual' : 'monthly';
}

function isPlusId(value: string | null | undefined): boolean {
  return normalize(value).includes('plus');
}

function isProId(value: string | null | undefined): boolean {
  return normalize(value).includes('pro');
}

function getTierFromProductIdentifier(value: string | null | undefined): Exclude<RevenueCatTier, 'free'> | null {
  if (isProId(value)) {
    return 'pro';
  }

  if (isPlusId(value)) {
    return 'plus';
  }

  return null;
}

function getActiveProductIdentifiers(customerInfo: CustomerInfo): string[] {
  const entitlementProductIds = Object.values(customerInfo.entitlements.active)
    .map((entitlement) => entitlement.productIdentifier)
    .filter((value): value is string => !!value);

  return Array.from(
    new Set([
      ...customerInfo.activeSubscriptions,
      ...entitlementProductIds,
    ])
  );
}

function getActiveEntitlementForTier(
  customerInfo: CustomerInfo,
  tier: Exclude<RevenueCatTier, 'free'>
) {
  return tier === 'pro'
    ? customerInfo.entitlements.active.pro
    : customerInfo.entitlements.active.plus;
}

export function getLatestRevenueCatActiveSubscription(
  customerInfo: CustomerInfo,
  tier?: Exclude<RevenueCatTier, 'free'>
): RevenueCatActiveSubscription | null {
  const candidates = new Map<string, RevenueCatActiveSubscription>();

  for (const subscriptionInfo of Object.values(customerInfo.subscriptionsByProductIdentifier)) {
    if (!subscriptionInfo.isActive) {
      continue;
    }

    const resolvedTier = getTierFromProductIdentifier(subscriptionInfo.productIdentifier);
    if (!resolvedTier || (tier && resolvedTier !== tier)) {
      continue;
    }

    const entitlement = getActiveEntitlementForTier(customerInfo, resolvedTier);

    candidates.set(subscriptionInfo.productIdentifier, {
      productIdentifier: subscriptionInfo.productIdentifier,
      tier: resolvedTier,
      billingPeriod: getBillingPeriodFromIdentifiers(
        entitlement?.productPlanIdentifier,
        subscriptionInfo.productIdentifier,
        entitlement?.productIdentifier
      ),
      purchaseDate: subscriptionInfo.purchaseDate ? new Date(subscriptionInfo.purchaseDate) : null,
      expiresAt: subscriptionInfo.expiresDate ? new Date(subscriptionInfo.expiresDate) : null,
    });
  }

  for (const productIdentifier of getActiveProductIdentifiers(customerInfo)) {
    if (candidates.has(productIdentifier)) {
      continue;
    }

    const resolvedTier = getTierFromProductIdentifier(productIdentifier);
    if (!resolvedTier || (tier && resolvedTier !== tier)) {
      continue;
    }

    const entitlement = getActiveEntitlementForTier(customerInfo, resolvedTier);
    const purchaseDate = customerInfo.allPurchaseDates[productIdentifier];
    const expirationDate = customerInfo.allExpirationDates[productIdentifier];

    candidates.set(productIdentifier, {
      productIdentifier,
      tier: resolvedTier,
      billingPeriod: getBillingPeriodFromIdentifiers(
        entitlement?.productPlanIdentifier,
        productIdentifier,
        entitlement?.productIdentifier
      ),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      expiresAt: expirationDate ? new Date(expirationDate) : null,
    });
  }

  const subscriptions = Array.from(candidates.values());

  if (subscriptions.length === 0) {
    return null;
  }

  subscriptions.sort((a, b) => {
    const purchaseDiff = (b.purchaseDate?.getTime() || 0) - (a.purchaseDate?.getTime() || 0);
    if (purchaseDiff !== 0) {
      return purchaseDiff;
    }

    return (b.expiresAt?.getTime() || 0) - (a.expiresAt?.getTime() || 0);
  });

  return subscriptions[0];
}

export function getCurrentRevenueCatProductIdentifier(customerInfo: CustomerInfo): string | null {
  return getLatestRevenueCatActiveSubscription(customerInfo)?.productIdentifier || null;
}

export function inferRevenueCatTier(customerInfo: CustomerInfo): RevenueCatTier {
  const latestActiveSubscription = getLatestRevenueCatActiveSubscription(customerInfo);

  if (latestActiveSubscription) {
    return latestActiveSubscription.tier;
  }

  const activeProductIds = getActiveProductIdentifiers(customerInfo);
  const hasActiveProProduct = activeProductIds.some((productId) => isProId(productId));
  const hasActivePlusProduct = activeProductIds.some((productId) => isPlusId(productId));

  if (hasActiveProProduct) {
    return 'pro';
  }

  if (hasActivePlusProduct) {
    return 'plus';
  }

  const hasPlusEntitlement = !!customerInfo.entitlements.active.plus;
  const hasProEntitlement = !!customerInfo.entitlements.active.pro;

  if (hasProEntitlement && !hasPlusEntitlement) {
    return 'pro';
  }

  if (hasPlusEntitlement && !hasProEntitlement) {
    return 'plus';
  }

  if (hasProEntitlement || hasPlusEntitlement) {
    const proProductId = customerInfo.entitlements.active.pro?.productIdentifier;
    const plusProductId = customerInfo.entitlements.active.plus?.productIdentifier;

    if (isPlusId(plusProductId) && !isProId(proProductId)) {
      return 'plus';
    }

    if (isProId(proProductId)) {
      return 'pro';
    }
  }

  return 'free';
}

export function inferRevenueCatBillingPeriod(
  customerInfo: CustomerInfo,
  tier: RevenueCatTier
): RevenueCatBillingPeriod {
  if (tier === 'free') {
    return null;
  }

  const latestSubscription = getLatestRevenueCatActiveSubscription(customerInfo, tier);

  if (latestSubscription) {
    return latestSubscription.billingPeriod;
  }

  const entitlement = getActiveEntitlementForTier(customerInfo, tier);

  return getBillingPeriodFromIdentifiers(
    entitlement?.productPlanIdentifier,
    entitlement?.productIdentifier
  );
}

export function getRevenueCatExpirationDate(
  customerInfo: CustomerInfo,
  tier: RevenueCatTier
): Date | null {
  if (tier === 'free') {
    return null;
  }

  const latestSubscription = getLatestRevenueCatActiveSubscription(customerInfo, tier);

  if (latestSubscription?.expiresAt) {
    return latestSubscription.expiresAt;
  }

  const entitlement =
    tier === 'pro' ? customerInfo.entitlements.active.pro : customerInfo.entitlements.active.plus;

  if (entitlement?.expirationDate) {
    return new Date(entitlement.expirationDate);
  }

  if (customerInfo.latestExpirationDate) {
    return new Date(customerInfo.latestExpirationDate);
  }

  return null;
}

export function packageMatchesPlan(
  pkg: PurchasesPackage,
  plan: Exclude<RevenueCatTier, 'free'>,
  period: Exclude<RevenueCatBillingPeriod, null>
): boolean {
  const identifier = normalize(pkg.identifier);
  const productIdentifier = normalize(pkg.product.identifier);
  const wantsAnnual = period === 'annual';
  const packageLooksAnnual = isAnnualId(identifier) || isAnnualId(productIdentifier);

  if (wantsAnnual !== packageLooksAnnual) {
    return false;
  }

  if (plan === 'pro') {
    return isProId(identifier) || isProId(productIdentifier);
  }

  return (
    PLUS_DEFAULT_PACKAGE_IDS.has(pkg.identifier) ||
    isPlusId(identifier) ||
    isPlusId(productIdentifier)
  );
}
