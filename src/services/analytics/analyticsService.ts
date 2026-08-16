import { db, auth } from '../firebase/firebase';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import type { AnalyticsEvent, UserFeedback, FacilityReport } from '../../types';

// Storage keys
const STORAGE_KEYS = {
  EVENTS_BUFFER: 'sehat_setu_analytics_buffer',
  FEEDBACK: 'sehat_setu_feedback_local',
  REPORTS: 'sehat_setu_reports_local'
};

// Generate session ID
const generateSessionId = () => {
  const key = 'sehat_setu_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem(key, sid);
  }
  return sid;
};

export const analyticsService = {
  // Track Access Funnel Stage Event
  async trackEvent(eventType: string, metadata: Record<string, any> = {}): Promise<void> {
    const user = auth.currentUser;
    const userId = user ? user.uid : undefined;
    const sessionId = generateSessionId();

    // Privacy Protection: Strip exact GPS and map to coarse district level
    const district = metadata.district || metadata.location?.value || undefined;
    
    // Clean metadata to strip any sensitive details
    const cleanMetadata = { ...metadata };
    delete cleanMetadata.exactLocation;
    delete cleanMetadata.coords;
    delete cleanMetadata.audioUrl;
    delete cleanMetadata.rawAudio;
    delete cleanMetadata.password;
    delete cleanMetadata.token;

    const event: AnalyticsEvent = {
      eventId: 'evt_' + Math.random().toString(36).substring(2, 15),
      sessionId,
      userId,
      eventType,
      district,
      language: metadata.language || 'kn',
      intent: metadata.intent || undefined,
      timestamp: new Date().toISOString(),
      metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined
    };

    // Buffer locally first for offline support & cost control
    const buffer = this.getLocalBuffer();
    buffer.push(event);
    localStorage.setItem(STORAGE_KEYS.EVENTS_BUFFER, JSON.stringify(buffer));

    // Determine priority: Journeys and outcomes write immediately to Firestore
    const highPriorityEvents = [
      'JOURNEY_STARTED',
      'JOURNEY_COMPLETED',
      'ACCESS_CONFIRMED',
      'FEEDBACK_SUBMITTED',
      'FACILITY_REPORT_CREATED',
      'SUPPORT_REQUEST_CREATED'
    ];

    if (user && !user.isAnonymous && highPriorityEvents.includes(eventType)) {
      try {
        await setDoc(doc(db, 'analyticsEvents', event.eventId), event);
      } catch (err) {
        console.warn('Failed to write high-priority event to Firestore, buffered locally:', err);
      }
    }
  },

  getLocalBuffer(): AnalyticsEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS_BUFFER);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // Submit citizen outcome feedback
  async submitFeedback(
    journeyId: string, 
    response: UserFeedback['response'], 
    reason?: UserFeedback['reason'], 
    comments?: string
  ): Promise<void> {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest-user';
    const feedbackId = 'fb_' + Math.random().toString(36).substring(2, 12);

    const feedback: UserFeedback = {
      feedbackId,
      userId,
      journeyId,
      response,
      reason,
      comments: comments?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    // Save locally
    const existing = this.getLocalFeedback();
    existing.push(feedback);
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(existing));

    // Save to Firestore
    if (user && !user.isAnonymous) {
      try {
        await setDoc(doc(db, 'feedback', feedbackId), feedback);
      } catch (e) {
        console.error('Failed to save feedback to Firestore:', e);
      }
    }

    // Trigger success event
    await this.trackEvent('FEEDBACK_SUBMITTED', { journeyId, response, reason });
    if (response === 'YES' || response === 'PARTIALLY') {
      await this.trackEvent('ACCESS_CONFIRMED', { journeyId, outcome: response });
    }
  },

  getLocalFeedback(): UserFeedback[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // Submit facility data report issue
  async submitFacilityReport(
    facilityId: string,
    facilityName: string,
    issueType: FacilityReport['issueType'],
    description: string
  ): Promise<void> {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest-user';
    const reportId = 'rep_' + Math.random().toString(36).substring(2, 12);

    const report: FacilityReport = {
      reportId,
      facilityId,
      facilityName,
      userId,
      issueType,
      description: description.trim(),
      createdAt: new Date().toISOString(),
      status: 'OPEN',
      updatedAt: new Date().toISOString()
    };

    // Save locally
    const existing = this.getLocalReports();
    existing.push(report);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(existing));

    // Save to Firestore
    if (user && !user.isAnonymous) {
      try {
        await setDoc(doc(db, 'facilityReports', reportId), report);
      } catch (e) {
        console.error('Failed to save facility report:', e);
      }
    }

    // Trigger report event
    await this.trackEvent('FACILITY_REPORT_CREATED', { facilityId, issueType });
  },

  getLocalReports(): FacilityReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // Retrieve all feedback documents (Admin only)
  async getAllFeedback(): Promise<UserFeedback[]> {
    const user = auth.currentUser;
    if (user) {
      try {
        const querySnapshot = await getDocs(collection(db, 'feedback'));
        const list: UserFeedback[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as UserFeedback);
        });
        if (list.length > 0) return list;
      } catch (e) {}
    }
    return this.getLocalFeedback();
  },

  // Retrieve all facility reports (Admin only)
  async getAllFacilityReports(): Promise<FacilityReport[]> {
    const user = auth.currentUser;
    if (user) {
      try {
        const querySnapshot = await getDocs(collection(db, 'facilityReports'));
        const list: FacilityReport[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as FacilityReport);
        });
        if (list.length > 0) return list;
      } catch (e) {}
    }
    return this.getLocalReports();
  },

  // Update facility report status (Admin only)
  async updateFacilityReportStatus(
    reportId: string,
    status: FacilityReport['status'],
    adminNotes?: string
  ): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'facilityReports', reportId), {
          status,
          adminNotes: adminNotes || '',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error('Failed to update report status in Firestore:', e);
      }
    }

    // Update locally
    const reports = this.getLocalReports();
    const idx = reports.findIndex(r => r.reportId === reportId);
    if (idx !== -1) {
      reports[idx].status = status;
      reports[idx].adminNotes = adminNotes;
      reports[idx].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    }
  }
};
