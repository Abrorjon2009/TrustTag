import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onClear }) => {
  const [query, setQuery] = useState('');

  const handleSearchSubmit = () => {
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <View style={styles.container}>
      <View style={styles.capsule}>
        <Ionicons name="search-outline" size={20} color={THEME.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search for products..."
          placeholderTextColor={THEME.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.colors.background,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: THEME.borderRadius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    backgroundColor: '#FFFFFF',
    paddingLeft: 14,
    paddingRight: 5,
    ...THEME.shadows.card,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '400',
    color: THEME.colors.textDark,
  },
  clearBtn: {
    padding: 6,
    marginRight: 2,
  },
  searchButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
});
