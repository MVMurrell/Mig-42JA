import { ImageAnnotatorClient } from '@google-cloud/vision';

export interface ImageModerationResult {
  approved: boolean;
  flagReason?: string;
  confidence?: number;
  detectedLabels?: string[];
  adultContent?: boolean;
  violenceContent?: boolean;
  medicalContent?: boolean;
  spoofContent?: boolean;
  raceContent?: boolean;
}

export class ImageModerationService {
  private visionClient!: ImageAnnotatorClient;
  private initialized: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      // Use dedicated Google Vision API credentials for image analysis
      const visionCredentials = process.env.GOOGLE_VISION_API_JUN_26_2025;
      
      if (!visionCredentials) {
        throw new Error('GOOGLE_VISION_API_JUN_26_2025 credentials not found');
      }

      const credentials = JSON.parse(visionCredentials);
      
      this.visionClient = new ImageAnnotatorClient({
        credentials: credentials,
        projectId: credentials.project_id || 'steam-house-461401-t7'
      });
      
      this.initialized = true;
      console.log('Image Moderation Service initialized with dedicated Google Vision API credentials');
    } catch (error) {
      console.error('Failed to initialize Image Moderation Service:', error);
      this.initialized = false;
    }
  }

  private async ensureInitialized(): Promise<boolean> {
    if (!this.initialized) {
      await this.initializeClient();
    }
    return this.initialized;
  }

  async moderateImage(imageBuffer: Buffer, imageType: 'profile' | 'quest'): Promise<ImageModerationResult> {
    console.log(`🖼️ IMAGE MODERATION: Starting ${imageType} image analysis`);
    
    if (!(await this.ensureInitialized())) {
      console.error('🚨 IMAGE MODERATION: Service not initialized - rejecting image for safety');
      return {
        approved: false,
        flagReason: 'Image moderation service unavailable - content rejected for safety'
      };
    }

    try {
      // Perform comprehensive image analysis
      const [result] = await this.visionClient.annotateImage({
        image: { content: imageBuffer },
        features: [
          { type: 'SAFE_SEARCH_DETECTION' },
          { type: 'LABEL_DETECTION', maxResults: 20 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          { type: 'TEXT_DETECTION' }
        ]
      });

      console.log(`🖼️ IMAGE MODERATION: Analysis completed for ${imageType} image`);

      // Check for explicit content using Safe Search
      const safeSearch = result.safeSearchAnnotation;
      if (safeSearch) {
        const adultLikelihood = this.getLikelihoodScore(String(safeSearch.adult));
        const violenceLikelihood = this.getLikelihoodScore(String(safeSearch.violence));
        const medicalLikelihood = this.getLikelihoodScore(String(safeSearch.medical));
        const spoofLikelihood = this.getLikelihoodScore(String(safeSearch.spoof));
        const racyLikelihood = this.getLikelihoodScore(String(safeSearch.racy));

        console.log(`🖼️ IMAGE MODERATION: Safe search scores - Adult: ${adultLikelihood}, Violence: ${violenceLikelihood}, Racy: ${racyLikelihood}`);

        // Different thresholds for profile pictures vs quest images
        // Profile pictures: More lenient to allow normal photos (only block VERY_LIKELY content)
        // Quest images: Stricter to maintain community standards
        const isProfile = imageType === 'profile';
        const adultThreshold = isProfile ? 5 : 3;  // VERY_LIKELY vs LIKELY
        const violenceThreshold = isProfile ? 4 : 3;  // LIKELY vs POSSIBLE
        const racyThreshold = isProfile ? 5 : 4;  // VERY_LIKELY vs LIKELY
        
        if (adultLikelihood >= adultThreshold || violenceLikelihood >= violenceThreshold || racyLikelihood >= racyThreshold) {
          return {
            approved: false,
            flagReason: `Image contains inappropriate content - Adult: ${this.scoreLevelToText(adultLikelihood)}, Violence: ${this.scoreLevelToText(violenceLikelihood)}, Racy: ${this.scoreLevelToText(racyLikelihood)}`,
            adultContent: adultLikelihood >= adultThreshold,
            violenceContent: violenceLikelihood >= violenceThreshold,
            raceContent: racyLikelihood >= racyThreshold,
            confidence: Math.max(adultLikelihood, violenceLikelihood, racyLikelihood) / 5
          };
        }
      }

      // Check detected labels for inappropriate content
      const labels = result.labelAnnotations || [];
      const detectedLabels = labels.map(label => label.description?.toLowerCase() || '');
      
      console.log(`🖼️ IMAGE MODERATION: Detected labels: ${detectedLabels.join(', ')}`);

      const inappropriateLabels = this.checkInappropriateLabels(detectedLabels);
      if (inappropriateLabels.length > 0) {
        return {
          approved: false,
          flagReason: `Image contains inappropriate content: ${inappropriateLabels.join(', ')}`,
          detectedLabels: inappropriateLabels
        };
      }

      // Check for inappropriate text in images
      const textAnnotations = result.textAnnotations || [];
      if (textAnnotations.length > 0) {
        const detectedText = textAnnotations.map(text => text.description || '').join(' ').toLowerCase();
        console.log(`🖼️ IMAGE MODERATION: Detected text: ${detectedText}`);
        
        const inappropriateText = this.checkInappropriateText(detectedText);
        if (inappropriateText.length > 0) {
          return {
            approved: false,
            flagReason: `Image contains inappropriate text: ${inappropriateText.join(', ')}`,
            detectedLabels: inappropriateText
          };
        }
      }

      // Additional checks for quest images (stricter standards)
      if (imageType === 'quest') {
        const questSpecificIssues = this.checkQuestSpecificContent(detectedLabels);
        if (questSpecificIssues.length > 0) {
          return {
            approved: false,
            flagReason: `Quest image violates guidelines: ${questSpecificIssues.join(', ')}`,
            detectedLabels: questSpecificIssues
          };
        }
      }

      console.log(`✅ IMAGE MODERATION: ${imageType} image approved`);
      return {
        approved: true,
        detectedLabels: detectedLabels
      };

    } catch (error) {
      console.error(`❌ IMAGE MODERATION: Analysis failed for ${imageType} image:`, error);
      // Fail closed - reject on moderation errors for security
      return {
        approved: false,
        flagReason: 'Image moderation analysis failed - content rejected for safety'
      };
    }
  }

  private getLikelihoodScore(likelihood: string | null | undefined): number {
    switch (likelihood) {
      case 'VERY_UNLIKELY': return 1;
      case 'UNLIKELY': return 2;
      case 'POSSIBLE': return 3;
      case 'LIKELY': return 4;
      case 'VERY_LIKELY': return 5;
      default: return 0;
    }
  }

  private scoreLevelToText(score: number): string {
    switch (score) {
      case 1: return 'Very Unlikely';
      case 2: return 'Unlikely';
      case 3: return 'Possible';
      case 4: return 'Likely';
      case 5: return 'Very Likely';
      default: return 'Unknown';
    }
  }

  private checkInappropriateLabels(labels: string[]): string[] {
    const inappropriateKeywords = [
      // Explicit content
      'nudity', 'nude', 'naked', 'underwear', 'lingerie', 'swimwear',
      // Violence and weapons
      'weapon', 'gun', 'knife', 'sword', 'violence', 'blood', 'fight',
      // Drugs and alcohol
      'drug', 'marijuana', 'cocaine', 'alcohol', 'beer', 'wine', 'smoking',
      // Hate symbols
      'nazi', 'swastika', 'confederate flag', 'hate symbol',
      // Inappropriate gestures
      'middle finger', 'obscene gesture',
      // Adult content
      'adult content', 'pornography', 'erotic'
    ];

    return labels.filter(label => 
      inappropriateKeywords.some(keyword => label.includes(keyword))
    );
  }

  private checkInappropriateText(text: string): string[] {
    const inappropriateWords = [
      // Profanity
      'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'cunt',
      // Hate speech
      'nigger', 'faggot', 'retard', 'spic', 'chink', 'kike',
      // Violence
      'kill yourself', 'die', 'murder', 'terrorist', 'bomb',
      // Sexual content
      'sex', 'porn', 'xxx', 'nude', 'naked'
    ];

    return inappropriateWords.filter(word => text.includes(word));
  }

  private checkQuestSpecificContent(labels: string[]): string[] {
    const questInappropriate = [
      // Commercial content not appropriate for quests
      'advertisement', 'logo', 'brand', 'commercial',
      // Content that doesn't fit quest nature
      'screenshot', 'computer screen', 'monitor display',
      // Inappropriate for challenge context
      'private parts', 'intimate', 'personal'
    ];

    return labels.filter(label => 
      questInappropriate.some(keyword => label.includes(keyword))
    );
  }
}

// Export singleton instance
export const imageModerationService = new ImageModerationService();