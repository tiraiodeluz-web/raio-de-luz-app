import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useItensCarrinho } from '@/lib/carrinho';

export default function TabsLayout() {
  const { session } = useAuth();
  const { data: itens } = useItensCarrinho();
  const badgeCarrinho = session && itens && itens.length > 0 ? String(itens.length) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors.fundoEscuro,
        tabBarInactiveTintColor: '#9598A6',
        tabBarStyle: { backgroundColor: '#ffffff' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="catalogos"
        options={{
          title: 'Catálogos',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="carrinho"
        options={{
          title: 'Carrinho',
          tabBarBadge: badgeCarrinho,
          tabBarBadgeStyle: { backgroundColor: '#1E8E3E' },
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'cart' : 'cart-outline'} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Meus pedidos',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'file-tray-full' : 'file-tray-full-outline'} color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
