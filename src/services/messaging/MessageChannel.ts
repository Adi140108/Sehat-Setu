import type { MessagePayload, LanguageCode } from '../../types';
import { classifyIntent } from '../ai/intentClassifier';
import { searchFacilities } from '../facilities/facilityService';
import { evaluateAllSchemes } from '../schemes/schemeEngine';

export interface ChannelResponse {
  replyText: string;
  suggestedButtons?: { label: string; actionPayload: string }[];
  audioResponseUrl?: string;
  facilityCard?: any;
  schemeCard?: any;
}

export interface MessageChannel {
  channelName: 'web' | 'whatsapp';
  sendMessage(payload: MessagePayload): Promise<ChannelResponse>;
}

export class WebChannel implements MessageChannel {
  channelName: 'web' = 'web';

  async sendMessage(payload: MessagePayload): Promise<ChannelResponse> {
    const lang: LanguageCode = payload.language || 'hi';
    const text = payload.text || '';
    const intentResult = await classifyIntent(text, lang);

    if (intentResult.isEmergency) {
      return {
        replyText: "🚨 EMERGENCY ALERT: Please seek emergency medical help immediately by calling 108 or visiting the nearest hospital emergency room.",
        suggestedButtons: [{ label: "Call 108 Emergency", actionPayload: "TEL:108" }]
      };
    }

    if (intentResult.category === 'FIND_FACILITY') {
      const facilities = searchFacilities({ pincodeOrCity: intentResult.extractedEntities.pincode });
      const top3 = facilities.slice(0, 3);
      return {
        replyText: `Found ${top3.length} verified public healthcare facilities near your area:`,
        facilityCard: top3[0]
      };
    }

    return {
      replyText: "Sehat Setu is ready to help you navigate nearby hospitals, government health schemes, or document requirements."
    };
  }
}

export class WhatsAppChannel implements MessageChannel {
  channelName: 'whatsapp' = 'whatsapp';

  async sendMessage(payload: MessagePayload): Promise<ChannelResponse> {
    const lang: LanguageCode = payload.language || 'hi';
    const text = payload.text || '';
    const intentResult = await classifyIntent(text, lang);

    if (intentResult.isEmergency) {
      return {
        replyText: "*🚨 SEHAT SETU EMERGENCY ALERT*\n\nPlease seek emergency medical help immediately.\n📞 Call National Emergency Helpline: *108*\n\nEmergency room instructions sent.",
        suggestedButtons: [{ label: "📞 Call 108 Now", actionPayload: "TEL:108" }]
      };
    }

    if (intentResult.category === 'FIND_FACILITY') {
      const facilities = searchFacilities({ pincodeOrCity: intentResult.extractedEntities.pincode });
      const f = facilities[0];
      return {
        replyText: `*🏥 SEHAT SETU FACILITY LOCATOR*\n\n*${f.name}*\n📍 ${f.address}\n📞 Phone: ${f.phone}\n✅ Schemes: ${f.schemesSupported.join(', ')}\n\nReply 'DIRECTIONS' for Google Map route.`,
        facilityCard: f
      };
    }

    if (intentResult.category === 'CHECK_SCHEME') {
      const results = evaluateAllSchemes({ age: 70, incomeCategory: 'BPL' });
      const topScheme = results[0].scheme;
      return {
        replyText: `*💳 HEALTH SCHEME INFORMATION*\n\n*${topScheme.shortName}*\nCoverage: ${topScheme.coverageDetails}\nTarget: ${topScheme.targetGroup}\n\n📄 *Documents Needed:* ${topScheme.documentsRequired.slice(0, 2).join(', ')}`,
        schemeCard: topScheme
      };
    }

    return {
      replyText: "Welcome to *Sehat Setu WhatsApp Assistant*!\n\nYou can ask:\n1. 'Paas mein hospital kidhar hai'\n2. 'Ayushman scheme documents'\n3. 'Emergency help'\n\nType your query or send a voice message."
    };
  }
}
