import { Injectable } from '@nestjs/common';

/**
 * VIRTUAL BACKGROUND SERVICE
 * ==========================
 * Quản lý virtual background như Google Meet/Zoom
 * 
 * Features:
 * - Predefined backgrounds
 * - Custom upload backgrounds
 * - Blur background
 * - Background preferences per user
 */

export interface VirtualBackground {
  id: string;
  type: 'predefined' | 'custom' | 'blur' | 'none';
  name: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  blurLevel?: number; // 0-100 for blur type
  category?: string;
  uploadedBy?: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface UserBackgroundPreference {
  userId: number;
  currentBackground: string | null; // background ID or null for none
  recentBackgrounds: string[]; // Last 5 used
  customBackgrounds: string[]; // User's uploaded backgrounds
}

@Injectable()
export class VirtualBackgroundService {
  // Predefined backgrounds
  private predefinedBackgrounds: Map<string, VirtualBackground> = new Map();
  
  // User custom backgrounds
  private customBackgrounds: Map<string, VirtualBackground> = new Map();
  
  // User preferences
  private userPreferences: Map<number, UserBackgroundPreference> = new Map();

  constructor() {
    this.initPredefinedBackgrounds();
  }

  /**
   * Initialize predefined backgrounds
   */
  private initPredefinedBackgrounds(): void {
    const backgrounds: Omit<VirtualBackground, 'createdAt'>[] = [
      // Blur options
      {
        id: 'blur-light',
        type: 'blur',
        name: 'Làm mờ nhẹ',
        blurLevel: 30,
        category: 'blur',
        isPublic: true,
      },
      {
        id: 'blur-medium',
        type: 'blur',
        name: 'Làm mờ vừa',
        blurLevel: 60,
        category: 'blur',
        isPublic: true,
      },
      {
        id: 'blur-strong',
        type: 'blur',
        name: 'Làm mờ mạnh',
        blurLevel: 90,
        category: 'blur',
        isPublic: true,
      },
      // Office backgrounds
      {
        id: 'office-modern',
        type: 'predefined',
        name: 'Văn phòng hiện đại',
        thumbnailUrl: '/backgrounds/thumbnails/office-modern.jpg',
        imageUrl: '/backgrounds/office-modern.jpg',
        category: 'office',
        isPublic: true,
      },
      {
        id: 'office-cozy',
        type: 'predefined',
        name: 'Góc làm việc ấm cúng',
        thumbnailUrl: '/backgrounds/thumbnails/office-cozy.jpg',
        imageUrl: '/backgrounds/office-cozy.jpg',
        category: 'office',
        isPublic: true,
      },
      {
        id: 'office-bookshelf',
        type: 'predefined',
        name: 'Kệ sách',
        thumbnailUrl: '/backgrounds/thumbnails/bookshelf.jpg',
        imageUrl: '/backgrounds/bookshelf.jpg',
        category: 'office',
        isPublic: true,
      },
      // Nature backgrounds
      {
        id: 'nature-beach',
        type: 'predefined',
        name: 'Bãi biển',
        thumbnailUrl: '/backgrounds/thumbnails/beach.jpg',
        imageUrl: '/backgrounds/beach.jpg',
        category: 'nature',
        isPublic: true,
      },
      {
        id: 'nature-mountain',
        type: 'predefined',
        name: 'Núi non',
        thumbnailUrl: '/backgrounds/thumbnails/mountain.jpg',
        imageUrl: '/backgrounds/mountain.jpg',
        category: 'nature',
        isPublic: true,
      },
      {
        id: 'nature-forest',
        type: 'predefined',
        name: 'Rừng cây',
        thumbnailUrl: '/backgrounds/thumbnails/forest.jpg',
        imageUrl: '/backgrounds/forest.jpg',
        category: 'nature',
        isPublic: true,
      },
      // Abstract backgrounds
      {
        id: 'abstract-gradient-blue',
        type: 'predefined',
        name: 'Gradient xanh',
        thumbnailUrl: '/backgrounds/thumbnails/gradient-blue.jpg',
        imageUrl: '/backgrounds/gradient-blue.jpg',
        category: 'abstract',
        isPublic: true,
      },
      {
        id: 'abstract-gradient-purple',
        type: 'predefined',
        name: 'Gradient tím',
        thumbnailUrl: '/backgrounds/thumbnails/gradient-purple.jpg',
        imageUrl: '/backgrounds/gradient-purple.jpg',
        category: 'abstract',
        isPublic: true,
      },
      // Classroom backgrounds
      {
        id: 'classroom-traditional',
        type: 'predefined',
        name: 'Lớp học truyền thống',
        thumbnailUrl: '/backgrounds/thumbnails/classroom.jpg',
        imageUrl: '/backgrounds/classroom.jpg',
        category: 'classroom',
        isPublic: true,
      },
      {
        id: 'classroom-library',
        type: 'predefined',
        name: 'Thư viện',
        thumbnailUrl: '/backgrounds/thumbnails/library.jpg',
        imageUrl: '/backgrounds/library.jpg',
        category: 'classroom',
        isPublic: true,
      },
    ];

    backgrounds.forEach(bg => {
      this.predefinedBackgrounds.set(bg.id, {
        ...bg,
        createdAt: new Date(),
      });
    });
  }

  /**
   * Get all predefined backgrounds
   */
  getPredefinedBackgrounds(): VirtualBackground[] {
    return Array.from(this.predefinedBackgrounds.values());
  }

  /**
   * Get backgrounds by category
   */
  getBackgroundsByCategory(category: string): VirtualBackground[] {
    return Array.from(this.predefinedBackgrounds.values())
      .filter(bg => bg.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.predefinedBackgrounds.forEach(bg => {
      if (bg.category) categories.add(bg.category);
    });
    return Array.from(categories);
  }

  /**
   * Upload custom background
   */
  uploadCustomBackground(
    userId: number,
    name: string,
    imageUrl: string,
    thumbnailUrl?: string,
  ): VirtualBackground {
    const id = `custom-${userId}-${Date.now()}`;
    
    const background: VirtualBackground = {
      id,
      type: 'custom',
      name,
      thumbnailUrl: thumbnailUrl || imageUrl,
      imageUrl,
      uploadedBy: userId,
      isPublic: false,
      createdAt: new Date(),
    };

    this.customBackgrounds.set(id, background);

    // Add to user's custom list
    const prefs = this.getOrCreateUserPrefs(userId);
    prefs.customBackgrounds.push(id);

    return background;
  }

  /**
   * Get user's custom backgrounds
   */
  getUserCustomBackgrounds(userId: number): VirtualBackground[] {
    const prefs = this.userPreferences.get(userId);
    if (!prefs) return [];

    return prefs.customBackgrounds
      .map(id => this.customBackgrounds.get(id))
      .filter((bg): bg is VirtualBackground => bg !== undefined);
  }

  /**
   * Delete custom background
   */
  deleteCustomBackground(userId: number, backgroundId: string): boolean {
    const bg = this.customBackgrounds.get(backgroundId);
    if (!bg || bg.uploadedBy !== userId) return false;

    this.customBackgrounds.delete(backgroundId);

    // Remove from user's list
    const prefs = this.userPreferences.get(userId);
    if (prefs) {
      prefs.customBackgrounds = prefs.customBackgrounds.filter(id => id !== backgroundId);
      if (prefs.currentBackground === backgroundId) {
        prefs.currentBackground = null;
      }
    }

    return true;
  }

  /**
   * Set user's current background
   */
  setUserBackground(userId: number, backgroundId: string | null): {
    success: boolean;
    background?: VirtualBackground | null;
    error?: string;
  } {
    const prefs = this.getOrCreateUserPrefs(userId);

    if (backgroundId === null) {
      // Remove background
      prefs.currentBackground = null;
      return { success: true, background: null };
    }

    // Find background
    let background = this.predefinedBackgrounds.get(backgroundId);
    if (!background) {
      background = this.customBackgrounds.get(backgroundId);
    }

    if (!background) {
      return { success: false, error: 'Background không tồn tại' };
    }

    // Check access for custom backgrounds
    if (background.type === 'custom' && background.uploadedBy !== userId && !background.isPublic) {
      return { success: false, error: 'Bạn không có quyền sử dụng background này' };
    }

    prefs.currentBackground = backgroundId;

    // Add to recent
    prefs.recentBackgrounds = [
      backgroundId,
      ...prefs.recentBackgrounds.filter(id => id !== backgroundId),
    ].slice(0, 5);

    return { success: true, background };
  }

  /**
   * Get user's current background
   */
  getUserCurrentBackground(userId: number): VirtualBackground | null {
    const prefs = this.userPreferences.get(userId);
    if (!prefs?.currentBackground) return null;

    return this.getBackgroundById(prefs.currentBackground);
  }

  /**
   * Get background by ID
   */
  getBackgroundById(id: string): VirtualBackground | null {
    return this.predefinedBackgrounds.get(id) || this.customBackgrounds.get(id) || null;
  }

  /**
   * Get user's recent backgrounds
   */
  getUserRecentBackgrounds(userId: number): VirtualBackground[] {
    const prefs = this.userPreferences.get(userId);
    if (!prefs) return [];

    return prefs.recentBackgrounds
      .map(id => this.getBackgroundById(id))
      .filter((bg): bg is VirtualBackground => bg !== undefined);
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId: number): UserBackgroundPreference {
    return this.getOrCreateUserPrefs(userId);
  }

  /**
   * Get or create user preferences
   */
  private getOrCreateUserPrefs(userId: number): UserBackgroundPreference {
    let prefs = this.userPreferences.get(userId);
    if (!prefs) {
      prefs = {
        userId,
        currentBackground: null,
        recentBackgrounds: [],
        customBackgrounds: [],
      };
      this.userPreferences.set(userId, prefs);
    }
    return prefs;
  }

  /**
   * Get all available backgrounds for a user (predefined + their custom)
   */
  getAllAvailableBackgrounds(userId: number): {
    blur: VirtualBackground[];
    predefined: VirtualBackground[];
    custom: VirtualBackground[];
    recent: VirtualBackground[];
  } {
    const predefined = this.getPredefinedBackgrounds();
    const blur = predefined.filter(bg => bg.type === 'blur');
    const nonBlur = predefined.filter(bg => bg.type !== 'blur');

    return {
      blur,
      predefined: nonBlur,
      custom: this.getUserCustomBackgrounds(userId),
      recent: this.getUserRecentBackgrounds(userId),
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    predefinedCount: number;
    customCount: number;
    totalUsers: number;
    categoryCounts: Record<string, number>;
  } {
    const categoryCounts: Record<string, number> = {};
    this.predefinedBackgrounds.forEach(bg => {
      if (bg.category) {
        categoryCounts[bg.category] = (categoryCounts[bg.category] || 0) + 1;
      }
    });

    return {
      predefinedCount: this.predefinedBackgrounds.size,
      customCount: this.customBackgrounds.size,
      totalUsers: this.userPreferences.size,
      categoryCounts,
    };
  }
}
