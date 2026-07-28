cmake_minimum_required(VERSION 3.20)
project(native_texture_canvas_module LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(REPO_ROOT "${CMAKE_SOURCE_DIR}/../../..")
set(SHOWCASE_DEPS "${CMAKE_SOURCE_DIR}/../node_modules")
set(SCINTILLA_EXTENSION_DEPS "${REPO_ROOT}/lynxtron-go/scintilla-extension/node_modules")

set(LYNX_HEADERS_ROOT "${CMAKE_SOURCE_DIR}/node_modules/@lynx-js/lynx-library-headers")
if(NOT EXISTS "${LYNX_HEADERS_ROOT}")
  set(LYNX_HEADERS_ROOT "${SHOWCASE_DEPS}/@lynx-js/lynx-library-headers")
endif()
if(NOT EXISTS "${LYNX_HEADERS_ROOT}")
  set(LYNX_HEADERS_ROOT "${REPO_ROOT}/node_modules/@lynx-js/lynx-library-headers")
endif()
if(NOT EXISTS "${LYNX_HEADERS_ROOT}")
  set(LYNX_HEADERS_ROOT "${SCINTILLA_EXTENSION_DEPS}/@lynx-js/lynx-library-headers")
endif()
set(LYNX_HEADERS_INCLUDE "${LYNX_HEADERS_ROOT}/include")

set(LYNXTRON_ROOT_CANDIDATES
  "${CMAKE_SOURCE_DIR}/node_modules/@lynx-js/lynxtron"
  "${SHOWCASE_DEPS}/@lynx-js/lynxtron"
  "${REPO_ROOT}/node_modules/@lynx-js/lynxtron"
  "${SCINTILLA_EXTENSION_DEPS}/@lynx-js/lynxtron"
)
set(LYNXTRON_ROOT "")
foreach(candidate IN LISTS LYNXTRON_ROOT_CANDIDATES)
  if(EXISTS "${candidate}/package.json")
    set(LYNXTRON_ROOT "${candidate}")
    break()
  endif()
endforeach()
if(NOT LYNXTRON_ROOT)
  message(FATAL_ERROR "Lynxtron package not found. Please ensure @lynx-js/lynxtron is installed.")
endif()
set(LYNXTRON_DIST "${LYNXTRON_ROOT}/dist")

if(WIN32)
  set(LYNXTRON_WINDOWS_RUNTIME_CANDIDATES
    "${LYNXTRON_DIST}/win32/x64"
    "${LYNXTRON_DIST}"
  )
  set(LYNXTRON_RUNTIME_DIR "")
  set(LYNXTRON_IMPORT_LIB "")
  foreach(runtime_dir IN LISTS LYNXTRON_WINDOWS_RUNTIME_CANDIDATES)
    if(EXISTS "${runtime_dir}/lynxtron.dll.lib")
      set(LYNXTRON_RUNTIME_DIR "${runtime_dir}")
      set(LYNXTRON_IMPORT_LIB "${runtime_dir}/lynxtron.dll.lib")
      break()
    elseif(EXISTS "${runtime_dir}/lynxtron.lib")
      set(LYNXTRON_RUNTIME_DIR "${runtime_dir}")
      set(LYNXTRON_IMPORT_LIB "${runtime_dir}/lynxtron.lib")
      break()
    endif()
  endforeach()
  if(NOT LYNXTRON_IMPORT_LIB)
    message(FATAL_ERROR "Lynxtron Windows import library not found under: ${LYNXTRON_WINDOWS_RUNTIME_CANDIDATES}")
  endif()
endif()

# ---------------------------------------------------------------------------
# bindings_lib — uses lynx-library-headers napi.h (no namespace remap)
# ---------------------------------------------------------------------------
add_library(bindings_lib OBJECT
  bindings/bind_napi.cc
)
target_include_directories(bindings_lib PRIVATE
  ${CMAKE_JS_INC}
  ${CMAKE_SOURCE_DIR}
  "${LYNX_HEADERS_INCLUDE}"
)

# ---------------------------------------------------------------------------
# module_lib — uses weak-node-api namespace remap for the extension module
# ---------------------------------------------------------------------------
set(NATIVE_TEXTURE_MODULE_SOURCES
  module/native_texture_canvas_module.cc
  module/native_texture_canvas_module.h
  module/native_texture_canvas_view.cc
  module/native_texture_canvas_view.h
)
if(APPLE)
  list(APPEND NATIVE_TEXTURE_MODULE_SOURCES module/native_texture_canvas_surface_mac.mm)
  enable_language(OBJCXX)
elseif(WIN32)
  list(APPEND NATIVE_TEXTURE_MODULE_SOURCES module/native_texture_canvas_surface_win.cc)
endif()

add_library(module_lib OBJECT
  ${NATIVE_TEXTURE_MODULE_SOURCES}
)
target_include_directories(module_lib PRIVATE
  ${CMAKE_JS_INC}
  ${CMAKE_SOURCE_DIR}
  "${LYNX_HEADERS_INCLUDE}"
)
target_compile_definitions(module_lib PRIVATE
  NAPI_CPP_CUSTOM_NAMESPACE=weak_node_api
  USE_WEAK_SUFFIX_NAPI
  NAPI_DISABLE_CPP_RTTI
  NAPI_DISABLE_CPP_EXCEPTIONS
)
if(MSVC)
  target_compile_options(module_lib PRIVATE /EHsc /bigobj)
else()
  target_compile_options(module_lib PRIVATE -fPIC -fvisibility=hidden)
endif()
if(APPLE)
  set_source_files_properties(module/native_texture_canvas_surface_mac.mm PROPERTIES COMPILE_FLAGS "-fobjc-arc")
endif()

# ---------------------------------------------------------------------------
# Main shared lib — links objects from both bindings_lib and module_lib
# ---------------------------------------------------------------------------
add_library(${PROJECT_NAME} SHARED
  ${CMAKE_JS_SRC}
  $<TARGET_OBJECTS:bindings_lib>
  $<TARGET_OBJECTS:module_lib>
)

set_target_properties(${PROJECT_NAME} PROPERTIES
  PREFIX ""
  SUFFIX ".node"
)

target_include_directories(${PROJECT_NAME} PRIVATE
  ${CMAKE_JS_INC}
  ${CMAKE_SOURCE_DIR}
  "${LYNX_HEADERS_INCLUDE}"
)

if(MSVC)
  target_compile_options(${PROJECT_NAME} PRIVATE /EHsc /bigobj)
else()
  target_compile_options(${PROJECT_NAME} PRIVATE -fPIC -fvisibility=hidden)
endif()

if(APPLE)
  set_target_properties(${PROJECT_NAME} PROPERTIES
    MACOSX_RPATH ON
    LINK_FLAGS "-undefined dynamic_lookup"
  )

  find_library(FOUNDATION_FRAMEWORK Foundation)
  find_library(IOSURFACE_FRAMEWORK IOSurface)

  target_link_libraries(${PROJECT_NAME} PRIVATE
    ${FOUNDATION_FRAMEWORK}
    ${IOSURFACE_FRAMEWORK}
  )
elseif(WIN32)
  target_compile_definitions(${PROJECT_NAME} PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
    UNICODE
    _UNICODE
    _CRT_SECURE_NO_WARNINGS
  )

  target_link_libraries(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_LIB}
    "${LYNXTRON_IMPORT_LIB}"
    d3d11
    dxgi
  )
endif()
