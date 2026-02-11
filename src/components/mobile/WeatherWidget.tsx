'use client';

import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Loader2, MapPin } from '@/components/ui/icons';

interface WeatherData {
  current: {
    temperature: number;
    weatherCode: number;
  };
  hourly: {
    time: string;
    temperature: number;
    weatherCode: number;
  }[];
  location?: string;
}

interface CachedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// Weather code to icon and description mapping (WMO codes)
const getWeatherInfo = (code: number) => {
  if (code === 0) return { icon: Sun, label: 'Clear' };
  if (code <= 3) return { icon: Cloud, label: 'Cloudy' };
  if (code <= 49) return { icon: Cloud, label: 'Foggy' };
  if (code <= 59) return { icon: CloudRain, label: 'Drizzle' };
  if (code <= 69) return { icon: CloudRain, label: 'Rain' };
  if (code <= 79) return { icon: CloudSnow, label: 'Snow' };
  if (code <= 84) return { icon: CloudRain, label: 'Showers' };
  if (code <= 94) return { icon: CloudSnow, label: 'Snow showers' };
  if (code <= 99) return { icon: CloudLightning, label: 'Thunderstorm' };
  return { icon: Cloud, label: 'Unknown' };
};

const LOCATION_CACHE_KEY = 'opsly_weather_location';
const LOCATION_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    const fetchWeather = async (lat: number, lng: number) => {
      try {
        // Open-Meteo API - free, no key required
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&forecast_hours=6&timezone=auto`
        );

        if (!response.ok) throw new Error('Weather fetch failed');

        const data = await response.json();

        setWeather({
          current: {
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code,
          },
          hourly: data.hourly.time.slice(0, 4).map((time: string, i: number) => ({
            time,
            temperature: Math.round(data.hourly.temperature_2m[i]),
            weatherCode: data.hourly.weather_code[i],
          })),
        });
        setLoading(false);
      } catch (err) {
        setError('Unable to fetch weather');
        setLoading(false);
      }
    };

    const getLocation = () => {
      // Check cached location first
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

      // Request geolocation
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Cache the location
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

  // Location denied state
  if (locationDenied) {
    return (
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] rounded-xl p-4">
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

  // Loading state
  if (loading) {
    return (
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] rounded-xl p-4">
        <div className="flex items-center gap-3 text-[rgb(var(--text-disabled))]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading weather...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !weather) {
    return (
      <div className="bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] rounded-xl p-4">
        <div className="flex items-center gap-3 text-[rgb(var(--text-disabled))]">
          <Wind className="w-5 h-5" />
          <span className="text-sm">{error || 'Weather unavailable'}</span>
        </div>
      </div>
    );
  }

  const currentWeather = getWeatherInfo(weather.current.weatherCode);
  const CurrentIcon = currentWeather.icon;

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-[rgb(var(--border))] rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Current weather */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 dark:bg-white/10 flex items-center justify-center">
            <CurrentIcon className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[rgb(var(--text-primary))]">{weather.current.temperature}</span>
              <span className="text-lg text-[rgb(var(--text-disabled))]">°C</span>
            </div>
            <p className="text-sm text-[rgb(var(--text-disabled))]">{currentWeather.label}</p>
          </div>
        </div>

        {/* 3-hour forecast */}
        <div className="flex gap-3">
          {weather.hourly.slice(1, 4).map((hour, i) => {
            const hourInfo = getWeatherInfo(hour.weatherCode);
            const HourIcon = hourInfo.icon;
            const time = new Date(hour.time);
            const hourLabel = time.getHours().toString().padStart(2, '0') + ':00';

            return (
              <div key={i} className="text-center">
                <p className="text-xs text-[rgb(var(--text-disabled))] mb-1">{hourLabel}</p>
                <HourIcon className="w-4 h-4 text-[rgb(var(--text-tertiary))] mx-auto mb-1" />
                <p className="text-xs font-medium text-[rgb(var(--text-secondary))]">{hour.temperature}°</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
