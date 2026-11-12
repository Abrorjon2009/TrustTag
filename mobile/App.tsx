import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './src/theme';
import { Product, TradeSession } from './src/types';
import { api } from './src/api/client';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LocationProvider, useLocation } from './src/context/LocationContext';

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

function MainApp() {
  const { currentUser } = useAuth();
  const { selectedRegion, selectedDistrict, selectedCity } = useLocation();

  // Active Bottom Tab: 'MARKETPLACE' | 'MY_TRADES' | 'WALLET' | 'PROFILE'
  const [activeTab, setActiveTab] = useState<'MARKETPLACE' | 'MY_TRADES' | 'WALLET' | 'PROFILE'>('MARKETPLACE');

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

  // User Trades State
  const [userTrades, setUserTrades] = useState<TradeSession[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Navbar */}
      <Header
        onOpenLocationPicker={() => setLocationModalVisible(true)}
        onOpenWallet={() => setWalletModalVisible(true)}
        onOpenAdmin={() => setAdminModalVisible(true)}
        onOpenNotifications={() => setNotificationModalVisible(true)}
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

          {/* Floating Action Button (FAB): "➕ Post Item" */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setAddProductModalVisible(true)}
            activeOpacity={0.88}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>Sell Item</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab 2: MY TRADES */}
      {activeTab === 'MY_TRADES' && (
        <View style={styles.tabViewContainer}>
          <Text style={styles.screenTitle}>My Safe Trade Sessions</Text>
          <Text style={styles.screenSubtitle}>
            Active and completed peer-to-peer trades with Central Bank Safe-Hold:
          </Text>

          {isLoadingTrades ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
          ) : userTrades.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-outline" size={54} color={THEME.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Active Trades</Text>
              <Text style={styles.emptySubtitle}>
                Browse marketplace products and tap "Chat & Start Safe Trade" to initiate a deal!
              </Text>
            </View>
          ) : (
            <FlatList
              data={userTrades}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
              renderItem={({ item }) => {
                const isBuyer = item.buyerId === currentUser?.id;
                return (
                  <TouchableOpacity
                    style={styles.tradeCard}
                    onPress={() => setActiveTradeId(item.id)}
                    activeOpacity={0.85}
                  >
                    {/* Live Status Banner */}
                    <View style={[styles.tradeBannerStrip, { backgroundColor: item.banner?.badgeBg || '#F3F4F6' }]}>
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
                        size={16}
                        color={item.banner?.badgeText || '#4B5563'}
                      />
                      <Text style={[styles.tradeBannerTitle, { color: item.banner?.badgeText || '#4B5563' }]}>
                        {item.banner?.title}
                      </Text>
                    </View>

                    <View style={styles.tradeCardBody}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tradeProductTitle} numberOfLines={1}>
                          {item.product?.title}
                        </Text>
                        <Text style={styles.tradeRoleText}>
                          Role: {isBuyer ? '🛒 Buyer (Customer)' : '📦 Seller'}
                        </Text>
                        <Text style={styles.tradePriceText}>
                          Agreed Price: ${item.agreedPrice.toFixed(2)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={THEME.colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Tab 3: WALLET */}
      {activeTab === 'WALLET' && (
        <View style={styles.tabViewContainer}>
          <TouchableOpacity
            style={styles.openWalletLargeBtn}
            onPress={() => setWalletModalVisible(true)}
          >
            <Ionicons name="wallet-outline" size={32} color="#FFF" />
            <Text style={styles.openWalletLargeText}>Open Central Bank Account & Wallet</Text>
            <Text style={styles.openWalletSub}>View Available, Safe-Hold & Frozen Balances</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab 4: PROFILE */}
      {activeTab === 'PROFILE' && (
        <View style={styles.tabViewContainer}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarPlaceholder}>
                <Text style={styles.profileAvatarText}>
                  {currentUser?.fullName?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.profileName}>{currentUser?.fullName}</Text>
                <Text style={styles.profilePhone}>{currentUser?.phoneNumber}</Text>
                <View style={styles.phoneVerifiedRow}>
                  <Ionicons name="checkmark-circle" size={14} color={THEME.colors.safeGreen} />
                  <Text style={styles.phoneVerifiedText}>Phone Verified Safe-Trader</Text>
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
                    <Text style={styles.watchlistThumbPrice}>${fav.price.toFixed(2)}</Text>
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

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => setAddProductModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.profileActionText}>List a Product for Sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => setWalletModalVisible(true)}
          >
            <Ionicons name="card-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.profileActionText}>My Central Bank Wallet</Text>
          </TouchableOpacity>
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
            Market
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('MY_TRADES')}
        >
          <Ionicons
            name={activeTab === 'MY_TRADES' ? 'shield-checkmark' : 'shield-checkmark-outline'}
            size={22}
            color={activeTab === 'MY_TRADES' ? THEME.colors.primary : THEME.colors.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === 'MY_TRADES' && styles.tabLabelActive]}>
            Trades
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setAddProductModalVisible(true)}
        >
          <View style={styles.centerPostPill}>
            <Ionicons name="add" size={24} color="#FFF" />
          </View>
          <Text style={[styles.tabLabel, { marginTop: 2 }]}>Sell</Text>
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
            Wallet
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
            Profile
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
        onProductCreated={fetchProducts}
      />

      <ChatTradeModal
        tradeId={activeTradeId}
        visible={Boolean(activeTradeId)}
        onClose={() => {
          setActiveTradeId(null);
          if (activeTab === 'MY_TRADES') fetchUserTrades();
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
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <MainApp />
      </LocationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  openWalletLargeBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
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
});
