<template>
    <!-- 搜索框以及按钮 -->
    <div class="flex justify-between items-center w-auto h-[50px]">
        <div class="w-5/6 h-full flex gap-2 px-5 justify-between items-center bg-gray-100 rounded-full ">
            <div class="flex items-center w-full">
                <Search class="mr-3" />
                <input type="text" class="bg-gray-100 w-full h-auto focus:outline-none caret-black"
                    placeholder="Search...">
            </div>
            <X />
        </div>
        <div class="">
            <div class=" bg-black text-white flex justify-center items-center w-[50px] h-[50px] rounded-full">
                <Search />
            </div>
        </div>
    </div>
</template>

<script setup> 
import { Search, X } from 'lucide-vue-next';



</script>

