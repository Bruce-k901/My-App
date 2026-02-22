import { View, Text } from '@react-pdf/renderer';
import { baseStyles, formatUKDate } from './PDFStyles';

interface PDFHeaderProps {
  title: string;
  siteName: string;
  date: string;
  subtitle?: string;
}

export function PDFHeader({ title, siteName, date, subtitle }: PDFHeaderProps) {
  return (
    <View style={baseStyles.pageHeader}>
      <View style={baseStyles.headerLeft}>
        <Text style={baseStyles.title}>{title}</Text>
        {subtitle && <Text style={baseStyles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={baseStyles.headerRight}>
        <Text style={baseStyles.siteName}>{siteName}</Text>
        <Text style={baseStyles.dateText}>{formatUKDate(date)}</Text>
      </View>
    </View>
  );
}
