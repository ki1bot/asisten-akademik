import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/app-theme";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
}: ScreenProps) {
  const { width } = useWindowDimensions();

  const horizontalPadding = width < 360 ? 16 : width < 768 ? 20 : 28;

  const contentStyle = [
    styles.content,
    {
      paddingHorizontal: horizontalPadding,
    },
    contentContainerStyle,
  ];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          <View style={contentStyle}>{children}</View>
        </ScrollView>
      ) : (
        <View style={styles.staticContainer}>
          <View style={[contentStyle, styles.flex]}>{children}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  staticContainer: {
    flex: 1,
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingTop: 12,
    paddingBottom: 44,
  },
});
