import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
}

const TRENDING_SEARCHES = [
  'iPhone 14 Pro Max',
  'Steam Account CS2',
  'MacBook Air M2',
  'PS5 Consoles',
  'Digital Software Keys',
];

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onClear }) => {
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % TRENDING_SEARCHES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = () => {
    onSearch(query.trim() || TRENDING_SEARCHES[placeholderIndex]);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <View style={styles.container}>
      <View style={styles.capsule}>
        <Ionicons name="search" size={18} color={THEME.colors.primary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={`Search "${TRENDING_SEARCHES[placeholderIndex]}"...`}
          placeholderTextColor={THEME.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearIcon}>
            <Ionicons name="close-circle" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cameraIcon} onPress={() => alert('Photo / Visual Search simulated')}>
          <Ionicons name="camera-outline" size={20} color={THEME.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearchSubmit}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    backgroundColor: '#FFFFFF',
    paddingLeft: 12,
    paddingRight: 4,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  clearIcon: {
    padding: 4,
  },
  cameraIcon: {
    padding: 6,
    marginRight: 4,
  },
  searchButton: {
    backgroundColor: THEME.colors.primary,
    height: 34,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

