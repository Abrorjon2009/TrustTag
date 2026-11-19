import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './src/theme';
import { Product, TradeSession } from './src/types';
import { api } from './src/api/client';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider, useLocation } from './src/context/LocationContext';
import { LanguageProvider, useTranslation } from './src/locales/i18n';
import { formatPrice, formatPhoneNumber } from './src/utils/formatters';

import { Header } from './src/components/Header';
import { SearchBar } from './src/components/SearchBar';
import { KingKongGrid } from './src/components/KingKongGrid';
import { ProductCard } from './src/components/ProductCard';
import { LocationPickerModal } from './src/components/LocationPickerModal';
import { ProductDetailModal } from './src/components/ProductDetailModal';
import { AddProductModal } from './src/components/AddProductModal';
import { ChatTradeModal } from './src/components/ChatTradeModal';
import { ReportModal } from './src/components/ReportModal';
import { WalletModal } from './src/components/WalletModal';
import { AdminDisputeModal } from './src/components/AdminDisputeModal';
import { NotificationModal } from './src/components/NotificationModal';
import { AuthModal } from './src/components/AuthModal';

function MainApp() {
  const { currentUser, logout } = useAuth();
  const { selectedRegion, selectedDistrict, selectedCity } = useLocation();
  const { lang, setLang, t } = useTranslation();

  // Active Bottom Tab: 'MARKETPLACE' | 'MY_TRADES' | 'WALLET' | 'PROFILE'
  const [activeTab, setActiveTab] = useState<'MARKETPLACE' | 'MY_TRADES' | 'WALLET' | 'PROFILE'>('MARKETPLACE');

  // Modals visibility
  const [authModalVisible, setAuthModalVisible] = useState(false);

  // Products & Feed State
  const [products, setProducts] = useState<Product[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [productTypeFilter, setProductTypeFilter] = useState<'ALL' | 'PHYSICAL' | 'ONLINE'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // User Trades & Chats State
  const [userTrades, setUserTrades] = useState<TradeSession[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [chatsSubTab, setChatsSubTab] = useState<'ALL_CHATS' | 'MY_PRODUCTS'>('ALL_CHATS');
  const [chatFilter, setChatFilter] = useState<'ALL' | 'BUYING' | 'SELLING'>('ALL');
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [isLoadingMyProducts, setIsLoadingMyProducts] = useState(false);

  // Modals visibility
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  // Active item & trade modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [reportTradeId, setReportTradeId] = useState<string | null>(null);

  // Fetch Favorites
  const fetchFavorites = async () => {
    if (!currentUser) return;
    try {
      const favs = await api.getFavorites(currentUser.id);
      setFavoriteProducts(favs);
      setFavoriteProductIds(favs.map((f: any) => f.id));
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (productId: string) => {
    if (!currentUser) return;
    try {
      const res = await api.toggleFavorite(currentUser.id, productId);
      if (res.isFavorite) {
        setFavoriteProductIds((prev) => [...prev, productId]);
      } else {
        setFavoriteProductIds((prev) => prev.filter((id) => id !== productId));
      }
      fetchFavorites();
    } catch (err) {
      console.error('Toggle favorite error:', err);
    }
  };

  // Fetch full user profile with reviews
  const fetchUserProfile = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getUserProfile(currentUser.id);
      setUserProfileData(data);
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  // Fetch Products based on all active filters
  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (productTypeFilter !== 'ALL') params.productType = productTypeFilter;
      if (sortBy) params.sort = sortBy;

      // Smart Location Filter parameters
      if (selectedRegion) params.customerRegionId = selectedRegion.id;
      if (selectedDistrict) params.customerDistrictId = selectedDistrict.id;
      if (selectedCity) params.customerCityId = selectedCity.id;

      const data = await api.getProducts(params);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoadingProducts(false);
      setIsRefreshing(false);
    }
  };

  // Fetch User Trades
  const fetchUserTrades = async () => {
    if (!currentUser) return;
    try {
      setIsLoadingTrades(true);
      const data = await api.getUserTrades(currentUser.id);
      setUserTrades(data);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setIsLoadingTrades(false);
    }
  };

  // Fetch Seller's Own Products
  const fetchMyProducts = async () => {
    if (!currentUser) return;
    try {
      setIsLoadingMyProducts(true);
      const data = await api.getSellerProducts(currentUser.id);
      setMyProducts(data);
    } catch (err) {
      console.error('Failed to fetch seller products:', err);
    } finally {
      setIsLoadingMyProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, productTypeFilter, sortBy, selectedRegion, selectedDistrict, selectedCity]);

  useEffect(() => {
    if (currentUser) {
      fetchFavorites();
      fetchUserProfile();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'MY_TRADES') {
      fetchUserTrades();
      fetchMyProducts();
    } else if (activeTab === 'PROFILE') {
      fetchUserProfile();
      fetchFavorites();
    }
  }, [activeTab, currentUser]);

  const handleStartTrade = async (product: Product, agreedPrice: number) => {
    if (!currentUser) return;
    try {
      const trade = await api.startTrade({
        productId: product.id,
        buyerId: currentUser.id,
        agreedPrice,
      });
      setSelectedProduct(null);
      setActiveTradeId(trade.id);
    } catch (err: any) {
      alert(`Could not start trade: ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Top Navbar */}
      <Header
        onOpenLocationPicker={() => setLocationModalVisible(true)}
        onOpenWallet={() => setWalletModalVisible(true)}
        onOpenAdmin={() => setAdminModalVisible(true)}
        onOpenNotifications={() => setNotificationModalVisible(true)}
        onOpenChats={() => {
          setActiveTab('MY_TRADES');
          setChatsSubTab('ALL_CHATS');
        }}
        onOpenAuth={() => setAuthModalVisible(true)}
      />

      {/* Main Content Area Based on Tab */}
      {activeTab === 'MARKETPLACE' && (
        <View style={{ flex: 1 }}>
          <ScrollView
            style={styles.feedScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  fetchProducts();
                }}
                colors={[THEME.colors.primary]}
              />
            }
          >
            {/* Taobao Pill Search Bar */}
            <SearchBar
              onSearch={(q) => setSearchQuery(q)}
              onClear={() => setSearchQuery('')}
            />

            {/* King Kong Category Matrix (2x5 Grid) */}
            <KingKongGrid
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
            />

            {/* Filter Chips & Sorting Toolbar */}
            <View style={styles.filterToolbar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {/* Product Type Chips */}
                {(['ALL', 'PHYSICAL', 'ONLINE'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, productTypeFilter === type && styles.filterChipActive]}
                    onPress={() => setProductTypeFilter(type)}
                  >
                    <Text style={[styles.filterChipText, productTypeFilter === type && styles.filterChipTextActive]}>
                      {type === 'ALL' ? 'All Goods' : type === 'PHYSICAL' ? 'Physical Only' : 'Digital / Online'}
                    </Text>
                  </TouchableOpacity>
                ))}

                <View style={styles.chipDivider} />

                {/* Sort Chips */}
                <TouchableOpacity
                  style={[styles.filterChip, sortBy === 'newest' && styles.filterChipActive]}
                  onPress={() => setSortBy('newest')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'newest' && styles.filterChipTextActive]}>
                    Newest
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, sortBy === 'price_asc' && styles.filterChipActive]}
                  onPress={() => setSortBy('price_asc')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'price_asc' && styles.filterChipTextActive]}>
                    Price: Low to High
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, sortBy === 'price_desc' && styles.filterChipActive]}
                  onPress={() => setSortBy('price_desc')}
                >
                  <Text style={[styles.filterChipText, sortBy === 'price_desc' && styles.filterChipTextActive]}>
                    Price: High to Low
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Product Feed Header */}
            <View style={styles.feedHeader}>
              <View style={styles.feedTitleRow}>
                <Ionicons name="sparkles" size={16} color={THEME.colors.primary} />
                <Text style={styles.feedHeading}>Explore Discovery Feed</Text>
              </View>
              <Text style={styles.itemCountText}>{products.length} Items Available</Text>
            </View>

            {/* 2-Column Waterfall / Masonry Grid */}
            {isLoadingProducts && !isRefreshing ? (
              <View style={styles.centerLoader}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.loaderText}>Finding products matching your location...</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={THEME.colors.textMuted} />
                <Text style={styles.emptyTitle}>No matching items found</Text>
                <Text style={styles.emptySubtitle}>
                  Try clearing your location filter or selecting "All Locations" to see items available nationwide.
                </Text>
              </View>
            ) : (
              <View style={styles.masonryGrid}>
                {/* Column 1 */}
                <View style={styles.column}>
                  {products
                    .filter((_, idx) => idx % 2 === 0)
                    .map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        isFavorite={favoriteProductIds.includes(item.id)}
                        onToggleFavorite={() => handleToggleFavorite(item.id)}
                        onPress={() => setSelectedProduct(item)}
                      />
                    ))}
                </View>

                {/* Column 2 */}
                <View style={styles.column}>
                  {products
                    .filter((_, idx) => idx % 2 === 1)
                    .map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        isFavorite={favoriteProductIds.includes(item.id)}
                        onToggleFavorite={() => handleToggleFavorite(item.id)}
                        onPress={() => setSelectedProduct(item)}
                      />
                    ))}
                </View>
              </View>
            )}

            <View style={{ height: 90 }} />
          </ScrollView>
        </View>
      )}

      {/* Tab 2: CHATS & TRADES */}
      {activeTab === 'MY_TRADES' && (
        <View style={styles.tabViewContainer}>
          {/* Top Title & Quick Post Button */}
          <View style={styles.chatsHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>
                {chatsSubTab === 'ALL_CHATS' ? (t.allChats || 'All Chats') : (t.myProductsAndChats || 'My Products & Chats')}
              </Text>
              <Text style={styles.screenSubtitle}>
                {chatsSubTab === 'ALL_CHATS'
                  ? 'Barcha xaridor va sotuvchilar bilan savdo suhbatlari'
                  : 'Siz joylashtirgan e\'lonlar va ularga kelgan xaridor xabarlari'}
              </Text>
            </View>
            {chatsSubTab === 'MY_PRODUCTS' && (
              <TouchableOpacity
                style={styles.addNewProductBtn}
                onPress={() => setAddProductModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addNewProductBtnText}>Yangi E'lon</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Segmented Top Switcher: All Chats vs My Products & Chats */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, chatsSubTab === 'ALL_CHATS' && styles.segmentBtnActive]}
              onPress={() => setChatsSubTab('ALL_CHATS')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chatbubbles"
                size={16}
                color={chatsSubTab === 'ALL_CHATS' ? '#FFFFFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.segmentBtnText, chatsSubTab === 'ALL_CHATS' && styles.segmentBtnTextActive]}>
                {t.allChats || 'All Chats'} ({userTrades.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, chatsSubTab === 'MY_PRODUCTS' && styles.segmentBtnActive]}
              onPress={() => {
                setChatsSubTab('MY_PRODUCTS');
                fetchMyProducts();
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cube"
                size={16}
                color={chatsSubTab === 'MY_PRODUCTS' ? '#FFFFFF' : THEME.colors.textSecondary}
              />
              <Text style={[styles.segmentBtnText, chatsSubTab === 'MY_PRODUCTS' && styles.segmentBtnTextActive]}>
                {t.myProductsAndChats || 'My Products'} ({myProducts.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* SUB-TAB 1: ALL CHATS */}
          {chatsSubTab === 'ALL_CHATS' && (
            <View style={{ flex: 1 }}>
              {/* Filter Chips: All / Buying / Selling */}
              <View style={styles.chatFilterRow}>
                {(['ALL', 'BUYING', 'SELLING'] as const).map((filter) => {
                  const count =
                    filter === 'ALL'
                      ? userTrades.length
                      : filter === 'BUYING'
                      ? userTrades.filter((t) => t.buyerId === currentUser?.id).length
                      : userTrades.filter((t) => t.sellerId === currentUser?.id).length;
                  const label =
                    filter === 'ALL'
                      ? `${t.all || 'Barchasi'} (${count})`
                      : filter === 'BUYING'
                      ? `🛒 ${t.buying || 'Xaridlarim'} (${count})`
                      : `📦 ${t.selling || 'Sotuvlarim'} (${count})`;
                  return (
                    <TouchableOpacity
                      key={filter}
                      style={[styles.chatFilterChip, chatFilter === filter && styles.chatFilterChipActive]}
                      onPress={() => setChatFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.chatFilterChipText,
                          chatFilter === filter && styles.chatFilterChipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isLoadingTrades ? (
                <View style={styles.centerLoader}>
                  <ActivityIndicator size="large" color={THEME.colors.primary} />
                </View>
              ) : (
                (() => {
                  const filteredTrades = userTrades.filter((t) => {
                    if (chatFilter === 'BUYING') return t.buyerId === currentUser?.id;
                    if (chatFilter === 'SELLING') return t.sellerId === currentUser?.id;
                    return true;
                  });

                  if (filteredTrades.length === 0) {
                    return (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={54} color={THEME.colors.textMuted} />
                        <Text style={styles.emptyTitle}>{t.noChatsYet || 'Hozircha chatlar mavjud emas'}</Text>
                        <Text style={styles.emptySubtitle}>
                          Bozordagi mahsulotlarni ko'rib, sotuvchi bilan suhbat boshlang yoki o'z e'loningizni joylashtiring!
                        </Text>
                        <TouchableOpacity
                          style={styles.emptyActionBtn}
                          onPress={() => setActiveTab('MARKETPLACE')}
                        >
                          <Ionicons name="storefront-outline" size={18} color="#FFF" />
                          <Text style={styles.emptyActionBtnText}>Bozorga O'tish</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return (
                    <FlatList
                      data={filteredTrades}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={{ paddingBottom: 90 }}
                      refreshControl={
                        <RefreshControl
                          refreshing={isLoadingTrades}
                          onRefresh={() => {
                            fetchUserTrades();
                            fetchMyProducts();
                          }}
                          colors={[THEME.colors.primary]}
                        />
                      }
                      renderItem={({ item }) => {
                        const isBuyer = item.buyerId === currentUser?.id;
                        const partner = isBuyer ? item.seller : item.buyer;
                        const lastMsg = item.chatMessages?.[0]?.messageText;
                        const lastTime = item.chatMessages?.[0]?.createdAt || item.updatedAt;

                        return (
                          <TouchableOpacity
                            style={styles.chatListItem}
                            onPress={() => setActiveTradeId(item.id)}
                            activeOpacity={0.85}
                          >
                            {/* Partner Avatar */}
                            <View style={styles.chatAvatarContainer}>
                              {partner?.avatarUrl ? (
                                <Image source={{ uri: partner.avatarUrl }} style={styles.chatPartnerAvatar} />
                              ) : (
                                <View style={[styles.chatPartnerAvatar, styles.chatAvatarPlaceholder]}>
                                  <Text style={styles.chatAvatarInitial}>
                                    {partner?.fullName?.charAt(0) || 'U'}
                                  </Text>
                                </View>
                              )}
                              <View style={[styles.roleBadgeDot, { backgroundColor: isBuyer ? '#3B82F6' : '#10B981' }]} />
                            </View>

                            {/* Chat Details */}
                            <View style={styles.chatContentCol}>
                              <View style={styles.chatTitleRow}>
                                <Text style={styles.chatPartnerName} numberOfLines={1}>
                                  {partner?.fullName || 'Foydalanuvchi'}
                                </Text>
                                <Text style={styles.chatTimeText}>
                                  {lastTime ? new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </Text>
                              </View>

                              {/* Product & Price Snippet */}
                              <View style={styles.chatProductSnippet}>
                                <Ionicons name="cube-outline" size={13} color={THEME.colors.textSecondary} />
                                <Text style={styles.chatProductTitle} numberOfLines={1}>
                                  {item.product?.title}
                                </Text>
                                <Text style={styles.chatProductPrice}>
                                  {formatPrice(item.agreedPrice)}
                                </Text>
                              </View>

                              {/* Last Message Preview */}
                              <Text style={styles.chatLastMessage} numberOfLines={1}>
                                {lastMsg ? `💬 ${lastMsg}` : `ℹ️ ${item.banner?.title || 'Kelishuv boshlandi'}`}
                              </Text>

                              {/* Escrow Status Pill */}
                              <View style={styles.chatStatusRow}>
                                <View style={[styles.chatStatusPill, { backgroundColor: item.banner?.badgeBg || '#F1F5F9' }]}>
                                  <Ionicons
                                    name={
                                      item.banner?.color === 'green'
                                        ? 'shield-checkmark'
                                        : item.banner?.color === 'yellow'
                                        ? 'warning'
                                        : item.banner?.color === 'blue'
                                        ? 'checkmark-circle'
                                        : item.banner?.color === 'red'
                                        ? 'alert-circle'
                                        : 'time'
                                    }
                                    size={12}
                                    color={item.banner?.badgeText || '#475569'}
                                  />
                                  <Text style={[styles.chatStatusPillText, { color: item.banner?.badgeText || '#475569' }]}>
                                    {item.banner?.title || item.status}
                                  </Text>
                                </View>
                                <Text style={styles.chatRoleTag}>
                                  {isBuyer ? '🛒 Siz Xaridorsiz' : '📦 Siz Sotuvchisiz'}
                                </Text>
                              </View>
                            </View>

                            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
                          </TouchableOpacity>
                        );
                      }}
                    />
                  );
                })()
              )}
            </View>
          )}

          {/* SUB-TAB 2: MY PRODUCTS & THEIR CHATS */}
          {chatsSubTab === 'MY_PRODUCTS' && (
            <View style={{ flex: 1 }}>
              {isLoadingMyProducts ? (
                <View style={styles.centerLoader}>
                  <ActivityIndicator size="large" color={THEME.colors.primary} />
                </View>
              ) : myProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={54} color={THEME.colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t.noProductsListed || 'Siz hali e\'lon joylashtirmagansiz'}</Text>
                  <Text style={styles.emptySubtitle}>
                    Mahsulotingizni joylashtiring, xaridorlardan kelgan barcha savdo xabarlari va takliflar shu yerda aks etadi!
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => setAddProductModalVisible(true)}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFF" />
                    <Text style={styles.emptyActionBtnText}>{t.addProduct || 'E\'lon Berish'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={myProducts}
                  keyExtractor={(p) => p.id}
                  contentContainerStyle={{ paddingBottom: 90 }}
                  refreshControl={
                    <RefreshControl
                      refreshing={isLoadingMyProducts}
                      onRefresh={() => {
                        fetchMyProducts();
                        fetchUserTrades();
                      }}
                      colors={[THEME.colors.primary]}
                    />
                  }
                  renderItem={({ item: prod }) => {
                    const prodChats = userTrades.filter((t) => t.productId === prod.id);
                    const prodImg = prod.images?.[0];

                    return (
                      <View style={styles.productChatGroupCard}>
                        {/* Product Header Row */}
                        <TouchableOpacity
                          style={styles.prodGroupHeader}
                          onPress={() => setSelectedProduct(prod)}
                          activeOpacity={0.88}
                        >
                          {prodImg ? (
                            <Image source={{ uri: prodImg }} style={styles.prodGroupThumb} />
                          ) : (
                            <View style={[styles.prodGroupThumb, styles.chatAvatarPlaceholder]}>
                              <Ionicons name="image-outline" size={20} color={THEME.colors.textMuted} />
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={styles.prodGroupTitleRow}>
                              <Text style={styles.prodGroupTitle} numberOfLines={1}>
                                {prod.title}
                              </Text>
                              <View
                                style={[
                                  styles.prodStatusBadge,
                                  prod.status === 'AVAILABLE'
                                    ? styles.prodStatusAvailable
                                    : prod.status === 'RESERVED_IN_TRADE'
                                    ? styles.prodStatusReserved
                                    : styles.prodStatusSold,
                                ]}
                              >
                                <Text style={styles.prodStatusText}>
                                  {prod.status === 'AVAILABLE' ? 'Faol' : prod.status === 'RESERVED_IN_TRADE' ? 'Savdoda' : 'Sotildi'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.prodGroupPrice}>{formatPrice(prod.price)}</Text>
                            <Text style={styles.prodGroupCategory}>
                              📁 {prod.category} • {prod.productType === 'ONLINE' ? '🌐 Onlayn' : '📦 Jismoniy'}
                            </Text>
                          </View>
                          <Ionicons name="eye-outline" size={18} color={THEME.colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Inquiries Section Under Product */}
                        <View style={styles.inquiriesSection}>
                          <View style={styles.inquiriesHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="chatbubble-ellipses-outline" size={16} color={THEME.colors.primary} />
                              <Text style={styles.inquiriesHeaderTitle}>
                                {t.chatsForThisProduct || 'Ushbu mahsulot bo\'yicha xabarlar'} ({prodChats.length})
                              </Text>
                            </View>
                            {prodChats.length > 0 && (
                              <View style={styles.inquiriesCountPill}>
                                <Text style={styles.inquiriesCountText}>{prodChats.length} ta xaridor</Text>
                              </View>
                            )}
                          </View>

                          {prodChats.length === 0 ? (
                            <View style={styles.emptyInquiriesBox}>
                              <Text style={styles.emptyInquiriesText}>
                                {t.noChatsForProduct || 'Ushbu mahsulotga hali xaridorlar xabar yozmagan.'}
                              </Text>
                            </View>
                          ) : (
                            prodChats.map((chat) => {
                              const buyer = chat.buyer;
                              const chatLastMsg = chat.chatMessages?.[0]?.messageText;
                              const isSafeHold = chat.status === 'MONEY_IN_SAFE_HOLD';

                              return (
                                <TouchableOpacity
                                  key={chat.id}
                                  style={[styles.buyerInquiryItem, isSafeHold && styles.buyerInquirySafeHold]}
                                  onPress={() => setActiveTradeId(chat.id)}
                                  activeOpacity={0.85}
                                >
                                  {/* Buyer Avatar */}
                                  {buyer?.avatarUrl ? (
                                    <Image source={{ uri: buyer.avatarUrl }} style={styles.inquiryBuyerAvatar} />
                                  ) : (
                                    <View style={[styles.inquiryBuyerAvatar, styles.chatAvatarPlaceholder]}>
                                      <Text style={styles.inquiryBuyerInitial}>
                                        {buyer?.fullName?.charAt(0) || 'X'}
                                      </Text>
                                    </View>
                                  )}

                                  {/* Buyer & Chat Info */}
                                  <View style={{ flex: 1, marginLeft: 10 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text style={styles.inquiryBuyerName} numberOfLines={1}>
                                        {buyer?.fullName || 'Xaridor'}
                                      </Text>
                                      <Text style={styles.inquiryPriceTag}>
                                        {formatPrice(chat.agreedPrice)}
                                      </Text>
                                    </View>

                                    {/* Status Badge */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 }}>
                                      <View style={[styles.inquiryStatusPill, { backgroundColor: chat.banner?.badgeBg || '#F1F5F9' }]}>
                                        <Text style={[styles.inquiryStatusText, { color: chat.banner?.badgeText || '#475569' }]}>
                                          {chat.banner?.title || chat.status}
                                        </Text>
                                      </View>
                                      {chat.banner?.canShip && (
                                        <View style={styles.shipReadyBadge}>
                                          <Ionicons name="cube" size={11} color="#059669" />
                                          <Text style={styles.shipReadyText}>Jo'natishga tayyor</Text>
                                        </View>
                                      )}
                                    </View>

                                    {/* Message preview */}
                                    <Text style={styles.inquiryMessagePreview} numberOfLines={1}>
                                      {chatLastMsg ? `💬 ${chatLastMsg}` : `ℹ️ ${chat.banner?.message || 'Chatni ochish'}`}
                                    </Text>
                                  </View>

                                  <Ionicons name="chatbubble-ellipses" size={18} color={THEME.colors.primary} />
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* Tab 3: WALLET */}
      {activeTab === 'WALLET' && (
        <ScrollView style={styles.tabViewContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Markaziy Bank Xavfsiz Hamyoni</Text>
          <Text style={styles.screenSubtitle}>
            Safe-Hold escrow tizimi orqali to'liq kafolatlangan balansingiz:
          </Text>

          {/* Balance Summary Card */}
          <View style={[styles.balanceCardInline]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={styles.balanceInlineLabel}>Mavjud Balans (Erkin)</Text>
                <Text style={styles.balanceInlineAmount}>
                  {formatPrice(currentUser?.wallet?.availableBalance || 0)}
                </Text>
              </View>
              <View style={styles.vaultShieldIcon}>
                <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.balanceInlineDivider} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.balanceSubLabel}>Xavfsiz Savdoda (Safe-Hold)</Text>
                <Text style={styles.balanceSubVal}>
                  {formatPrice(currentUser?.wallet?.safeHoldBalance || 0)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.balanceSubLabel}>Muzlatilgan (Tekshiruvda)</Text>
                <Text style={[styles.balanceSubVal, { color: THEME.colors.alertRed }]}>
                  {formatPrice(currentUser?.wallet?.frozenBalance || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Wallet Action Buttons */}
          <View style={styles.walletActionRow}>
            <TouchableOpacity
              style={[styles.walletActionBtn, { backgroundColor: THEME.colors.primary }]}
              onPress={() => setWalletModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.walletActionBtnText}>Hamyonni To'ldirish</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.walletActionBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: THEME.colors.primary }]}
              onPress={() => setWalletModalVisible(true)}
            >
              <Ionicons name="card-outline" size={18} color={THEME.colors.primary} />
              <Text style={[styles.walletActionBtnText, { color: THEME.colors.primary }]}>Kartaga Chiqarish</Text>
            </TouchableOpacity>
          </View>

          {/* Security Guarantee Box */}
          <View style={styles.walletSecurityBox}>
            <Ionicons name="lock-closed" size={20} color={THEME.colors.safeGreen} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.walletSecurityTitle}>Markaziy Bank Xavfsizlik Kafolati</Text>
              <Text style={styles.walletSecurityDesc}>
                Sizning mablag'laringiz mustaqil Xavfsiz Hisobda saqlanadi. Mahsulot to'liq tekshirib olinmaguncha sotuvchiga o'tkazilmaydi.
              </Text>
            </View>
          </View>

          {/* Open Full Ledger Button */}
          <TouchableOpacity
            style={styles.openWalletLargeBtn}
            onPress={() => setWalletModalVisible(true)}
          >
            <Ionicons name="receipt-outline" size={22} color="#FFF" />
            <Text style={styles.openWalletLargeText}>To'liq Tranzaksiyalar Tarixi & Hisobot</Text>
            <Text style={styles.openWalletSub}>Barcha kirim, chiqim va xavfsiz hold o'tkazmalari</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Tab 4: PROFILE */}
      {activeTab === 'PROFILE' && (
        <View style={styles.tabViewContainer}>
          {!currentUser ? (
            <View style={styles.guestProfileCard}>
              <View style={styles.guestIconCircle}>
                <Ionicons name="person-circle-outline" size={68} color={THEME.colors.primary} />
              </View>
              <Text style={styles.guestTitle}>Xush kelibsiz!</Text>
              <Text style={styles.guestSubtitle}>
                E'lon berish, xavfsiz savdo qilish va hamyondan foydalanish uchun tizimga kiring.
              </Text>
              <TouchableOpacity
                style={styles.guestLoginBtn}
                onPress={() => setAuthModalVisible(true)}
              >
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.guestLoginBtnText}>Tizimga Kirish / Ro'yxatdan O'tish</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarPlaceholder}>
                <Text style={styles.profileAvatarText}>
                  {currentUser?.fullName?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.profileName}>{currentUser?.fullName}</Text>
                <Text style={styles.profilePhone}>{formatPhoneNumber(currentUser?.phoneNumber)}</Text>
                <View style={styles.phoneVerifiedRow}>
                  <Ionicons name="checkmark-circle" size={14} color={THEME.colors.safeGreen} />
                  <Text style={styles.phoneVerifiedText}>Phone Verified Safe-Trader (SMS)</Text>
                </View>
              </View>
            </View>

            {/* Trust Counters */}
            <View style={styles.trustCounterRow}>
              <View style={styles.trustCounterBox}>
                <Text style={styles.trustCounterVal}>{currentUser?.successfulSalesCount}</Text>
                <Text style={styles.trustCounterLabel}>Sales Completed</Text>
              </View>
              <View style={styles.trustCounterBox}>
                <Text style={styles.trustCounterVal}>{currentUser?.successfulBuysCount}</Text>
                <Text style={styles.trustCounterLabel}>Purchases via Safe-Hold</Text>
              </View>
              <View style={styles.trustCounterBox}>
                <Text style={[styles.trustCounterVal, { color: THEME.colors.alertRed }]}>
                  {currentUser?.unresolvedReportsCount}
                </Text>
                <Text style={styles.trustCounterLabel}>Open Reports</Text>
              </View>
            </View>
          </View>

          {/* Saved Watchlist Section */}
          <View style={styles.profileSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="heart" size={16} color={THEME.colors.alertRed} />
              <Text style={styles.profileSectionTitle}>My Saved Watchlist ({favoriteProducts.length})</Text>
            </View>
            {favoriteProducts.length === 0 ? (
              <Text style={styles.emptyWatchlistText}>
                No saved items yet. Tap the heart icon on any listing to save it to your Watchlist.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {favoriteProducts.map((fav) => (
                  <TouchableOpacity
                    key={fav.id}
                    style={styles.watchlistThumbCard}
                    onPress={() => setSelectedProduct(fav)}
                  >
                    <Image source={{ uri: fav.images?.[0] }} style={styles.watchlistThumbImg} />
                    <Text style={styles.watchlistThumbTitle} numberOfLines={1}>{fav.title}</Text>
                    <Text style={styles.watchlistThumbPrice}>{formatPrice(fav.price)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Verified Trade Reviews Section */}
          <View style={styles.profileSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="star" size={16} color={THEME.colors.vipGold} />
              <Text style={styles.profileSectionTitle}>
                Verified Trade Reviews ({userProfileData?.reviewsReceived?.length || 0})
              </Text>
            </View>
            {(!userProfileData?.reviewsReceived || userProfileData.reviewsReceived.length === 0) ? (
              <Text style={styles.emptyWatchlistText}>
                No reviews yet. Authentic reviews can only be left by real trading partners after a Safe Trade is completed.
              </Text>
            ) : (
              userProfileData.reviewsReceived.map((rev: any) => (
                <View key={rev.id} style={styles.reviewItemBox}>
                  <View style={styles.reviewItemHeader}>
                    <Text style={styles.reviewAuthor}>{rev.author?.fullName}</Text>
                    <Text style={styles.reviewStars}>{'⭐'.repeat(rev.rating)}</Text>
                  </View>
                  {rev.comment ? (
                    <Text style={styles.reviewCommentText}>"{rev.comment}"</Text>
                  ) : null}
                  <Text style={styles.reviewDateText}>{new Date(rev.createdAt).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </View>

          {/* Language Switcher */}
          <View style={styles.profileSection}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="globe-outline" size={16} color={THEME.colors.primary} />
              <Text style={styles.profileSectionTitle}>{t.chooseLanguage}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {[
                { code: 'uz', label: "O'zbekcha 🇺🇿" },
                { code: 'ru', label: "Русский 🇷🇺" },
                { code: 'en', label: "English 🇬🇧" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.langChip,
                    lang === item.code && styles.langChipActive,
                  ]}
                  onPress={() => setLang(item.code as any)}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      lang === item.code && styles.langChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => setAuthModalVisible(true)}
          >
            <Ionicons name="sparkles-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.profileActionText}>Yangi Akkaunt Ochish / Kirish (Google, TG, Email, Tel)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={20} color={THEME.colors.alertRed} />
            <Text style={[styles.profileActionText, { color: THEME.colors.alertRed }]}>{t.logout || 'Chiqish'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => setAddProductModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.profileActionText}>{t.addProduct}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => {
              setActiveTab('MY_TRADES');
              setChatsSubTab('ALL_CHATS');
            }}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.profileActionText}>{t.allChats || 'Barcha Chatlar va Xabarlar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => {
              setActiveTab('MY_TRADES');
              setChatsSubTab('MY_PRODUCTS');
            }}
          >
            <Ionicons name="cube-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.profileActionText}>{t.myProductsAndChats || 'Mening E\'lonlarim & Xabarlar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => setWalletModalVisible(true)}
          >
            <Ionicons name="card-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.profileActionText}>{t.wallet}</Text>
          </TouchableOpacity>

          {/* Account Deletion (Google Play / App Store Compliance) */}
          <TouchableOpacity
            style={[styles.profileActionBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
            onPress={() => {
              const executeDelete = () => {
                api.deleteAccount()
                  .then(() => {
                    Alert.alert('Muvaffaqiyatli', 'Hisob muvaffaqiyatli o\'chirildi.');
                    logout();
                  })
                  .catch((err) => Alert.alert('Xatolik', err.message));
              };

              if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
                if (window.confirm('Haqiqatan ham hisobingizni o\'chirmoqchimisiz? Bu amalni ortga qaytarib bo\'lmaydi.')) {
                  executeDelete();
                }
              } else {
                Alert.alert(
                  'Hisobni o\'chirish',
                  'Haqiqatan ham hisobingizni o\'chirmoqchimisiz? Bu amalni ortga qaytarib bo\'lmaydi.',
                  [
                    { text: 'Bekor qilish', style: 'cancel' },
                    { text: 'O\'chirish', style: 'destructive', onPress: executeDelete },
                  ]
                );
              }
            }}
          >
            <Ionicons name="trash-outline" size={20} color={THEME.colors.alertRed} />
            <Text style={[styles.profileActionText, { color: THEME.colors.alertRed }]}>{t.deleteAccount}</Text>
          </TouchableOpacity>
              <View style={{ height: 90 }} />
            </ScrollView>
          )}
        </View>
      )}

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('MARKETPLACE')}
        >
          <Ionicons
            name={activeTab === 'MARKETPLACE' ? 'storefront' : 'storefront-outline'}
            size={22}
            color={activeTab === 'MARKETPLACE' ? THEME.colors.primary : THEME.colors.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'MARKETPLACE' && styles.tabLabelActive]}>
            {t.marketplace || 'Market'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('MY_TRADES')}
        >
          <Ionicons
            name={activeTab === 'MY_TRADES' ? 'chatbubbles' : 'chatbubbles-outline'}
            size={22}
            color={activeTab === 'MY_TRADES' ? THEME.colors.primary : THEME.colors.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'MY_TRADES' && styles.tabLabelActive]}>
            {t.chats || 'Chats'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setAddProductModalVisible(true)}
        >
          <View style={styles.centerPostPill}>
            <Ionicons name="add" size={24} color="#FFF" />
          </View>
          <Text style={[styles.tabLabel, { marginTop: 2 }]}>
            {t.addProduct || 'Sell'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setWalletModalVisible(true)}
        >
          <Ionicons
            name={activeTab === 'WALLET' ? 'wallet' : 'wallet-outline'}
            size={22}
            color={activeTab === 'WALLET' ? THEME.colors.primary : THEME.colors.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'WALLET' && styles.tabLabelActive]}>
            {t.wallet || 'Wallet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('PROFILE')}
        >
          <Ionicons
            name={activeTab === 'PROFILE' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'PROFILE' ? THEME.colors.primary : THEME.colors.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'PROFILE' && styles.tabLabelActive]}>
            {t.profile || 'Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ALL OVERLAY MODALS */}
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />

      <ProductDetailModal
        product={selectedProduct}
        visible={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onStartTrade={handleStartTrade}
      />

      <AddProductModal
        visible={addProductModalVisible}
        onClose={() => setAddProductModalVisible(false)}
        onProductCreated={() => {
          fetchProducts();
          fetchMyProducts();
        }}
      />

      <ChatTradeModal
        tradeId={activeTradeId}
        visible={Boolean(activeTradeId)}
        onClose={() => {
          setActiveTradeId(null);
          fetchUserTrades();
          fetchMyProducts();
        }}
        onOpenReport={(tId) => setReportTradeId(tId)}
      />

      <ReportModal
        tradeSessionId={reportTradeId}
        visible={Boolean(reportTradeId)}
        onClose={() => setReportTradeId(null)}
        onReportFiled={() => {
          if (activeTradeId) {
            // refresh
          }
        }}
      />

      <WalletModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
      />

      <AdminDisputeModal
        visible={adminModalVisible}
        onClose={() => setAdminModalVisible(false)}
      />

      <NotificationModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        onSelectNotification={(linkId) => {
          if (linkId) {
            setActiveTradeId(linkId);
          }
        }}
      />

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <LocationProvider>
          <View style={styles.webDesktopBackground}>
            <View style={styles.mobilePhoneFrame}>
              <MainApp />
            </View>
          </View>
        </LocationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  webDesktopBackground: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#0F172A' : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  mobilePhoneFrame: {
    width: '100%',
    maxWidth: 440,
    height: '100%',
    maxHeight: Platform.OS === 'web' ? '96vh' : '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 32 : 0,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'web' ? 8 : 0,
    borderColor: '#1E293B',
    elevation: 10,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: '100%',
  },
  feedScroll: {
    flex: 1,
    backgroundColor: THEME.colors.canvasBg,
  },
  filterToolbar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  chipsScroll: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: THEME.colors.canvasBg,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primaryTint,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  chipDivider: {
    width: 1,
    height: 18,
    backgroundColor: THEME.colors.borderMedium,
    marginHorizontal: 4,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  feedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  itemCountText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  masonryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 10,
  },
  column: {
    flex: 1,
  },
  centerLoader: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.pill,
    ...THEME.shadows.float,
    gap: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  tabViewContainer: {
    flex: 1,
    backgroundColor: THEME.colors.canvasBg,
    padding: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
  },
  chatsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addNewProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.pill,
    gap: 4,
  },
  addNewProductBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.card,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  chatFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chatFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatFilterChipActive: {
    backgroundColor: THEME.colors.primaryTint,
    borderColor: THEME.colors.primary,
  },
  chatFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  chatFilterChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  chatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...THEME.shadows.card,
  },
  chatAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatPartnerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0',
  },
  chatAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E7FF',
  },
  chatAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  roleBadgeDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatContentCol: {
    flex: 1,
  },
  chatTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPartnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  chatTimeText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  chatProductSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  chatProductTitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  chatProductPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  chatLastMessage: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    marginTop: 4,
    lineHeight: 16,
  },
  chatStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  chatStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  chatStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chatRoleTag: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.pill,
    marginTop: 12,
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  productChatGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...THEME.shadows.card,
  },
  prodGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prodGroupThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  prodGroupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prodGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  prodStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  prodStatusAvailable: {
    backgroundColor: '#DEF7EC',
  },
  prodStatusReserved: {
    backgroundColor: '#E1EFFE',
  },
  prodStatusSold: {
    backgroundColor: '#F3F4F6',
  },
  prodStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#03543F',
  },
  prodGroupPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  prodGroupCategory: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  inquiriesSection: {
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  inquiriesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inquiriesHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  inquiriesCountPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inquiriesCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  emptyInquiriesBox: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyInquiriesText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  buyerInquiryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buyerInquirySafeHold: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  inquiryBuyerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  inquiryBuyerInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  inquiryBuyerName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  inquiryPriceTag: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  inquiryStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inquiryStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  shipReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  shipReadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  inquiryMessagePreview: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  tradeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.md,
    overflow: 'hidden',
    marginBottom: 10,
    ...THEME.shadows.card,
  },
  tradeBannerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tradeBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  tradeCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  tradeProductTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  tradeRoleText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  tradePriceText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 4,
  },
  balanceCardInline: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    marginBottom: 16,
    ...THEME.shadows.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  balanceInlineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
  },
  balanceInlineAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.primary,
    marginTop: 4,
  },
  vaultShieldIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceInlineDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  balanceSubLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  balanceSubVal: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  walletActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  walletActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
  },
  walletActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  walletSecurityBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.safeGreenLight,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  walletSecurityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.safeGreen,
  },
  walletSecurityDesc: {
    fontSize: 11,
    color: '#065F46',
    marginTop: 2,
    lineHeight: 16,
  },
  openWalletLargeBtn: {
    backgroundColor: '#0F172A',
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...THEME.shadows.float,
  },
  openWalletLargeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  openWalletSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
  },
  guestProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 28,
    alignItems: 'center',
    margin: 16,
    ...THEME.shadows.card,
  },
  guestIconCircle: {
    marginBottom: 12,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  guestLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    gap: 8,
    ...THEME.shadows.hover,
  },
  guestLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 18,
    ...THEME.shadows.card,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  profilePhone: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  phoneVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneVerifiedText: {
    fontSize: 11,
    color: THEME.colors.safeGreen,
    fontWeight: '600',
  },
  trustCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    marginTop: 16,
    paddingTop: 12,
  },
  trustCounterBox: {
    alignItems: 'center',
    flex: 1,
  },
  trustCounterVal: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  trustCounterLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  profileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 10,
    gap: 10,
    ...THEME.shadows.card,
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    marginBottom: 14,
    ...THEME.shadows.card,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  profileSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  emptyWatchlistText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginTop: 4,
  },
  watchlistThumbCard: {
    width: 110,
    backgroundColor: THEME.colors.canvasBg,
    borderRadius: THEME.borderRadius.sm,
    padding: 6,
    marginRight: 8,
  },
  watchlistThumbImg: {
    width: '100%',
    height: 80,
    borderRadius: THEME.borderRadius.xs,
    marginBottom: 4,
  },
  watchlistThumbTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  watchlistThumbPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  reviewItemBox: {
    borderTopWidth: 0.5,
    borderTopColor: THEME.colors.borderSubtle,
    paddingTop: 8,
    marginTop: 8,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  reviewStars: {
    fontSize: 10,
  },
  reviewCommentText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  reviewDateText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 3,
  },
  tabLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  centerPostPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langChipActive: {
    backgroundColor: '#FFF2EB',
    borderColor: THEME.colors.primary,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  langChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
});
