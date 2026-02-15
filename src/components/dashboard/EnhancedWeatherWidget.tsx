'use client';

import { useState, useEffect } from 'react';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Loader2,
  MapPin,
  Droplets,
  Thermometer,
  Eye,
  Sunrise,
  Sunset,
} from '@/components/ui/icons';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { useChartTheme } from '@/hooks/dashboard/useChartTheme';

interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    weatherCode: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
  };
  hourly: {
    time: string;
    temperature: number;
    weatherCode: number;
  }[];
  daily: {
    tempMax: number;
    tempMin: number;
    sunrise: string;
    sunset: string;
  };
  location?: string;
}

interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

const getWeatherInfo = (code: number) => {
  if (code === 0) return { icon: Sun, label: 'Clear sky', gradient: 'from-amber-500/15 via-orange-500/10 to-blue-500/10' };
  if (code <= 3) return { icon: Cloud, label: 'Partly cloudy', gradient: 'from-slate-500/15 via-blue-500/10 to-indigo-500/10' };
  if (code <= 49) return { icon: Cloud, label: 'Foggy', gradient: 'from-slate-500/15 via-gray-500/10 to-slate-500/10' };
  if (code <= 59) return { icon: CloudRain, label: 'Drizzle', gradient: 'from-blue-500/15 via-slate-500/10 to-blue-500/10' };
  if (code <= 69) return { icon: CloudRain, label: 'Rain', gradient: 'from-blue-500/20 via-indigo-500/10 to-blue-500/10' };
  if (code <= 79) return { icon: CloudSnow, label: 'Snow', gradient: 'from-blue-300/20 via-slate-400/10 to-white/10' };
  if (code <= 84) return { icon: CloudRain, label: 'Showers', gradient: 'from-blue-500/20 via-indigo-500/10 to-blue-500/10' };
  if (code <= 94) return { icon: CloudSnow, label: 'Snow showers', gradient: 'from-blue-300/20 via-slate-400/10 to-white/10' };
  if (code <= 99) return { icon: CloudLightning, label: 'Thunderstorm', gradient: 'from-purple-500/20 via-indigo-500/15 to-slate-500/10' };
  return { icon: Cloud, label: 'Unknown', gradient: 'from-slate-500/10 to-blue-500/10' };
};

const LOCATION_CACHE_KEY = 'opsly_weather_location';
const LOCATION_CACHE_DURATION = 24 * 60 * 60 * 1000;

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function EnhancedWeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ct = useChartTheme();
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    const fetchWeather = async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
          `&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,uv_index` +
          `&hourly=temperature_2m,weather_code&forecast_hours=12` +
          `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=1` +
          `&timezone=auto`
        );

        if (!response.ok) throw new Error('Weather fetch failed');
        const data = await response.json();

        setWeather({
          current: {
            temperature: Math.round(data.current.temperature_2m),
            feelsLike: Math.round(data.current.apparent_temperature),
            weatherCode: data.current.weather_code,
            humidity: Math.round(data.current.relative_humidity_2m),
            windSpeed: Math.round(data.current.wind_speed_10m),
            uvIndex: Math.round(data.current.uv_index),
          },
          hourly: data.hourly.time.map((time: string, i: number) => ({
            time,
            temperature: Math.round(data.hourly.temperature_2m[i]),
            weatherCode: data.hourly.weather_code[i],
          })),
          daily: {
            tempMax: Math.round(data.daily.temperature_2m_max[0]),
            tempMin: Math.round(data.daily.temperature_2m_min[0]),
            sunrise: data.daily.sunrise[0],
            sunset: data.daily.sunset[0],
          },
        });
        setLoading(false);
      } catch {
        setError('Unable to fetch weather');
        setLoading(false);
      }
    };

    const getLocation = () => {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        try {
          const { latitude, longitude, timestamp }: CachedLocation = JSON.parse(cached);
          if (Date.now() - timestamp < LOCATION_CACHE_DURATION) {
            fetchWeather(latitude, longitude);
            return;
          }
        } catch {
          localStorage.removeItem(LOCATION_CACHE_KEY);
        }
      }

      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          localStorage.setItem(
            LOCATION_CACHE_KEY,
            JSON.stringify({ latitude, longitude, timestamp: Date.now() })
          );
          fetchWeather(latitude, longitude);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLocationDenied(true);
          }
          setError('Location unavailable');
          setLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    };

    getLocation();
  }, []);

  if (locationDenied) {
    return (
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-module-fg/[0.12] rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3 text-[rgb(var(--text-disabled))]">
          <MapPin className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium text-[rgb(var(--text-primary))]">Weather</p>
            <p className="text-xs">Enable location for local weather</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-module-fg/[0.12] rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3 text-[rgb(var(--text-disabled))]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-module-fg/[0.12] rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3 text-[rgb(var(--text-disabled))]">
          <Wind className="w-5 h-5" />
          <span className="text-sm">{error || 'Weather unavailable'}</span>
        </div>
      </div>
    );
  }

  const currentWeather = getWeatherInfo(weather.current.weatherCode);
  const CurrentIcon = currentWeather.icon;

  // Build chart data from hourly forecast
  const chartData = weather.hourly.map((h) => ({
    time: new Date(h.time).getHours().toString().padStart(2, '0') + ':00',
    temp: h.temperature,
  }));

  // Pick 6 evenly spaced forecast hours for the icon row
  const forecastHours = weather.hourly.filter((_, i) => i > 0 && i % 2 === 0).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className={cn(
        'bg-gradient-to-r',
        currentWeather.gradient,
        'border border-module-fg/[0.12] rounded-xl p-4 mb-5 overflow-hidden'
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Left: Current conditions */}
        <div className="flex items-center gap-4 lg:min-w-[200px]">
          <div className="w-14 h-14 rounded-2xl bg-black/[0.03] dark:bg-white/5 flex items-center justify-center flex-shrink-0">
            <CurrentIcon className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[rgb(var(--text-primary))] leading-none">
                {weather.current.temperature}
              </span>
              <span className="text-lg text-[rgb(var(--text-disabled))]">°C</span>
            </div>
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-0.5">{currentWeather.label}</p>
            <p className="text-[10px] text-[rgb(var(--text-disabled))]">
              H:{weather.daily.tempMax}° L:{weather.daily.tempMin}°
            </p>
          </div>
        </div>

        {/* Middle: Detail pills */}
        <div className="flex flex-wrap gap-2 lg:gap-3 lg:pt-1">
          <DetailPill icon={Thermometer} label="Feels like" value={`${weather.current.feelsLike}°`} />
          <DetailPill icon={Droplets} label="Humidity" value={`${weather.current.humidity}%`} />
          <DetailPill icon={Wind} label="Wind" value={`${weather.current.windSpeed} km/h`} />
          <DetailPill icon={Eye} label="UV Index" value={`${weather.current.uvIndex}`} />
          <DetailPill icon={Sunrise} label="Sunrise" value={formatTime(weather.daily.sunrise)} />
          <DetailPill icon={Sunset} label="Sunset" value={formatTime(weather.daily.sunset)} />
        </div>

        {/* Right: 12-hour temp chart */}
        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] text-[rgb(var(--text-disabled))] mb-1">12-hour temperature</p>
          <div className="h-[60px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weatherTempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: ct.tick }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: ct.tooltipBg,
                    border: `1px solid ${ct.tooltipBorder}`,
                    borderRadius: 8,
                    fontSize: 11,
                    color: ct.tooltipText,
                  }}
                  formatter={(value: number) => [`${value}°C`, 'Temp']}
                />
                <Area
                  type="monotone"
                  dataKey="temp"
                  stroke="#60A5FA"
                  strokeWidth={1.5}
                  fill="url(#weatherTempGrad)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom: Hourly forecast icons */}
      <div className="flex justify-between mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
        {forecastHours.map((hour, i) => {
          const hourInfo = getWeatherInfo(hour.weatherCode);
          const HourIcon = hourInfo.icon;
          const time = new Date(hour.time);
          const label = time.getHours().toString().padStart(2, '0') + ':00';

          return (
            <div key={i} className="text-center flex-1">
              <p className="text-[10px] text-[rgb(var(--text-disabled))] mb-1">{label}</p>
              <HourIcon className="w-4 h-4 text-[rgb(var(--text-tertiary))] mx-auto mb-1" />
              <p className="text-[11px] font-medium text-[rgb(var(--text-secondary))]">{hour.temperature}°</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function DetailPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]">
      <Icon className="w-3 h-3 text-[rgb(var(--text-disabled))]" />
      <div className="flex items-baseline gap-1">
        <span className="text-[10px] text-[rgb(var(--text-disabled))]">{label}</span>
        <span className="text-[11px] font-medium text-[rgb(var(--text-secondary))]">{value}</span>
      </div>
    </div>
  );
}
