import type {
  CreateIncidentRequest,
  CreateSurveyRequest,
  OverviewQuery,
  UpdateIncidentRequest,
  UpdateSurveyRequest,
} from "@feedback-platform/shared";
import {
  createAutoReplyRule,
  deleteAutoReplyRule,
  fetchAutoReplyRules,
  generateReviewReplies,
  updateAutoReplyRule,
} from "./aiReplies";
import {
  createCompetitor,
  deleteCompetitor,
  fetchCompetitorAnalytics,
  fetchCompetitors,
  refreshCompetitors,
} from "./competitors";
import { exportCustomersUrl, fetchCustomers } from "./customers";
import {
  completeGoogleCallback,
  fetchGoogleConnection,
  startGoogleConnect,
  syncGoogleReviews,
} from "./google";
import {
  createIncident,
  fetchIncidents,
  updateIncident,
} from "./incidents";
import { fetchIncidentAnalytics } from "./incidentAnalytics";
import { fetchListings, syncListings } from "./listings";
import { fetchOverview } from "./overview";
import { fetchReviewAnalytics } from "./reviewAnalytics";
import {
  exportReviewsUrl,
  fetchReviews,
  importReviewsCsv,
  replyToReview,
} from "./reviews";
import {
  createSurvey,
  deleteSurvey,
  fetchSurveys,
  updateSurvey,
} from "./surveys";
import {
  createLocation,
  fetchLocations,
  fetchTenantShell,
  updateLocation,
} from "./tenant";

export function createTenantClient(slug: string) {
  return {
    shell: () => fetchTenantShell(slug),
    locations: {
      list: () => fetchLocations(slug),
      create: (input: Parameters<typeof createLocation>[1]) =>
        createLocation(slug, input),
      update: (
        locationId: string,
        input: Parameters<typeof updateLocation>[2],
      ) => updateLocation(slug, locationId, input),
    },
    surveys: {
      list: () => fetchSurveys(slug),
      create: (input: CreateSurveyRequest) => createSurvey(slug, input),
      update: (surveyId: string, input: UpdateSurveyRequest) =>
        updateSurvey(slug, surveyId, input),
      remove: (surveyId: string) => deleteSurvey(slug, surveyId),
    },
    customers: {
      list: () => fetchCustomers(slug),
      exportUrl: () => exportCustomersUrl(slug),
    },
    incidents: {
      list: () => fetchIncidents(slug),
      create: (input: CreateIncidentRequest) => createIncident(slug, input),
      update: (incidentId: string, input: UpdateIncidentRequest) =>
        updateIncident(slug, incidentId, input),
    },
    overview: {
      get: (query?: OverviewQuery) => fetchOverview(slug, query),
    },
    incidentAnalytics: {
      get: (query?: Parameters<typeof fetchIncidentAnalytics>[1]) =>
        fetchIncidentAnalytics(slug, query),
    },
    reviews: {
      list: (query?: Parameters<typeof fetchReviews>[1]) =>
        fetchReviews(slug, query),
      import: (input: Parameters<typeof importReviewsCsv>[1]) =>
        importReviewsCsv(slug, input),
      reply: (reviewId: string, input: Parameters<typeof replyToReview>[2]) =>
        replyToReview(slug, reviewId, input),
      exportUrl: (query?: Parameters<typeof exportReviewsUrl>[1]) =>
        exportReviewsUrl(slug, query),
      generateReplies: (input: Parameters<typeof generateReviewReplies>[1]) =>
        generateReviewReplies(slug, input),
    },
    reviewAnalytics: {
      get: (query?: Parameters<typeof fetchReviewAnalytics>[1]) =>
        fetchReviewAnalytics(slug, query),
    },
    listings: {
      list: () => fetchListings(slug),
      sync: () => syncListings(slug),
    },
    competitors: {
      list: () => fetchCompetitors(slug),
      create: (input: Parameters<typeof createCompetitor>[1]) =>
        createCompetitor(slug, input),
      remove: (competitorId: string) => deleteCompetitor(slug, competitorId),
      refresh: () => refreshCompetitors(slug),
      analytics: (query?: Parameters<typeof fetchCompetitorAnalytics>[1]) =>
        fetchCompetitorAnalytics(slug, query),
    },
    google: {
      status: () => fetchGoogleConnection(slug),
      connect: () => startGoogleConnect(slug),
      callback: (input: Parameters<typeof completeGoogleCallback>[1]) =>
        completeGoogleCallback(slug, input),
      sync: () => syncGoogleReviews(slug),
    },
    autoReplyRules: {
      list: () => fetchAutoReplyRules(slug),
      create: (input: Parameters<typeof createAutoReplyRule>[1]) =>
        createAutoReplyRule(slug, input),
      update: (ruleId: string, input: Parameters<typeof updateAutoReplyRule>[2]) =>
        updateAutoReplyRule(slug, ruleId, input),
      remove: (ruleId: string) => deleteAutoReplyRule(slug, ruleId),
    },
  };
}

export type TenantClient = ReturnType<typeof createTenantClient>;
