<template>
  <div class="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
    <div class="relative py-3 sm:max-w-xl sm:mx-auto">
      <div class="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
        <div class="max-w-md mx-auto">
          <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-900">shop-user-two</h1>
            <p class="mt-2 text-gray-600">使用 Vite + Vue 3 + TypeScript + Tailwind CSS + Headless UI</p>
          </div>
          
          <div class="mt-8">
            <Menu as="div" class="relative inline-block text-left">
              <div>
                <MenuButton class="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-opacity-70">
                  选项
                  <svg
                    class="w-5 h-5 ml-2 -mr-1 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </MenuButton>
              </div>

              <transition
                enter-active-class="transition duration-100 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-75 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
              >
                <MenuItems class="absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg">
                  <div class="px-1 py-1">
                    <MenuItem v-slot="{ active }">
                      <button :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex rounded-md items-center w-full px-2 py-2 text-sm']">
                        选项 1
                      </button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'group flex rounded-md items-center w-full px-2 py-2 text-sm']">
                        选项 2
                      </button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
</script>