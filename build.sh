#!/bin/bash

# OrenoTodo ビルドスクリプト
# 使用方法:
#   ./build.sh          - 通常ビルド
#   ./build.sh clean    - クリーンビルド
#   ./build.sh package  - ビルド + パッケージング

set -e  # エラーが発生したら即座に終了

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ出力関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ビルド成果物のクリーンアップ
clean_build() {
    log_info "ビルド成果物をクリーンアップしています..."

    if [ -d "dist" ]; then
        rm -rf dist
        log_success "dist/ を削除しました"
    fi

    if [ -d "dist-electron" ]; then
        rm -rf dist-electron
        log_success "dist-electron/ を削除しました"
    fi

    if [ -d "release" ]; then
        rm -rf release
        log_success "release/ を削除しました"
    fi

    log_success "クリーンアップ完了"
}

# 依存関係のチェック
check_dependencies() {
    log_info "依存関係をチェックしています..."

    if [ ! -d "node_modules" ]; then
        log_warning "node_modules が見つかりません。npm install を実行します..."
        npm install
    fi

    log_success "依存関係のチェック完了"
}

# TypeScriptビルド
build_typescript() {
    log_info "TypeScriptをビルドしています..."

    # フロントエンドのTypeScriptチェック
    log_info "フロントエンドのTypeScriptをチェック中..."
    npx tsc --noEmit
    log_success "フロントエンドのTypeScriptチェック完了"

    # Electronのビルド
    log_info "Electronのビルド中..."
    npx tsc -p tsconfig.electron.json
    log_success "Electronのビルド完了"
}

# Viteビルド
build_vite() {
    log_info "Viteでフロントエンドをビルドしています..."
    npx vite build
    log_success "Viteビルド完了"
}

# パッケージング
package_app() {
    log_info "アプリケーションをパッケージングしています..."
    npx electron-builder
    log_success "パッケージング完了"

    if [ -d "release" ]; then
        log_info "パッケージングされたファイル:"
        ls -lh release/
    fi
}

# メインビルドプロセス
build_main() {
    log_info "========================================="
    log_info "  OrenoTodo ビルド開始"
    log_info "========================================="

    check_dependencies
    build_vite
    build_typescript

    log_success "========================================="
    log_success "  ビルド完了！"
    log_success "========================================="
}

# エラーハンドリング
trap 'log_error "ビルドが失敗しました"; exit 1' ERR

# コマンドライン引数の処理
case "${1:-}" in
    clean)
        log_info "クリーンビルドを実行します"
        clean_build
        build_main
        ;;
    package)
        log_info "ビルド + パッケージングを実行します"
        build_main
        package_app
        ;;
    help|--help|-h)
        echo "使用方法:"
        echo "  ./build.sh          - 通常ビルド"
        echo "  ./build.sh clean    - クリーンビルド"
        echo "  ./build.sh package  - ビルド + パッケージング"
        echo "  ./build.sh help     - このヘルプを表示"
        exit 0
        ;;
    "")
        build_main
        ;;
    *)
        log_error "不明なオプション: $1"
        echo "使用方法: ./build.sh [clean|package|help]"
        exit 1
        ;;
esac
