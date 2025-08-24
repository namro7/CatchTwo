#!/bin/bash

# CatchTwo Enhanced Installation Script
# This script will install all dependencies and set up the environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print colored output
print_color() {
    echo -e "${1}${2}${NC}"
}

print_header() {
    echo ""
    print_color $BLUE "╔══════════════════════════════════════════════════════════════╗"
    print_color $BLUE "║              CatchTwo Enhanced Installation              ║"
    print_color $BLUE "║         Pokétwo Autocatcher + Discord Bot Setup             ║"
    print_color $BLUE "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

print_step() {
    print_color $CYAN "📦 $1"
}

print_success() {
    print_color $GREEN "✅ $1"
}

print_warning() {
    print_color $YELLOW "⚠️  $1"
}

print_error() {
    print_color $RED "❌ $1"
}

print_info() {
    print_color $PURPLE "ℹ️  $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_step "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is >= 16
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 16 ]; then
            print_warning "Node.js version 16 or higher is recommended. Current: $NODE_VERSION"
        fi
    else
        print_error "Node.js is not installed!"
        echo ""
        print_info "Please install Node.js from: https://nodejs.org/"
        print_info "Recommended version: 18.x LTS or higher"
        exit 1
    fi
}

# Check if npm is available
check_npm() {
    print_step "Checking npm installation..."
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: v$NPM_VERSION"
    else
        print_error "npm is not installed!"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing Node.js dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Dependencies installed successfully"
    else
        print_error "package.json not found!"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_step "Creating necessary directories..."
    
    mkdir -p data
    mkdir -p messages
    mkdir -p public
    
    print_success "Directories created"
}

# Create default files if they don't exist
create_default_files() {
    print_step "Creating default configuration files..."
    
    # Create default messages.txt if it doesn't exist
    if [ ! -f "messages/messages.txt" ]; then
        cat > messages/messages.txt << 'EOL'
pokemon go brrr
catch them all!
gotta catch em all
pokemon master in training
hunting for shinies
level grinding time
pokemon adventure continues
catch rate is life
shiny hunting mode activated
pokemon trainer life
time to catch some pokemon
pokemon everywhere
legendary hunt begins
shiny or not here i come
pokemon collection growing
catch rate increasing
training to be the very best
pokemon journey continues
another day another catch
pokemon master grind
EOL
        print_success "Default messages.txt created"
    fi
    
    # Create empty caughtMessages.txt if it doesn't exist
    if [ ! -f "messages/caughtMessages.txt" ]; then
        touch messages/caughtMessages.txt
        print_success "Empty caughtMessages.txt created"
    fi
    
    # Create empty catches.txt if it doesn't exist
    if [ ! -f "data/catches.txt" ]; then
        touch data/catches.txt
        print_success "Empty catches.txt created"
    fi
    
    # Create default levelup.json if it doesn't exist
    if [ ! -f "data/levelup.json" ]; then
        echo '{}' > data/levelup.json
        print_success "Default levelup.json created"
    fi
}

# Check if required files exist
check_required_files() {
    print_step "Checking for required files..."
    
    REQUIRED_FILES=(
        "index-fixed.js"
        "bot.js"
        "autocatcher-integration.js"
        "start-all.js"
        "setup.js"
    )
    
    MISSING_FILES=()
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            MISSING_FILES+=("$file")
        fi
    done
    
    if [ ${#MISSING_FILES[@]} -eq 0 ]; then
        print_success "All required files are present"
    else
        print_error "Missing required files:"
        for file in "${MISSING_FILES[@]}"; do
            echo "   - $file"
        done
        print_info "Please ensure all files from the enhanced version are present"
        exit 1
    fi
}

# Set executable permissions
set_permissions() {
    print_step "Setting executable permissions..."
    
    chmod +x setup.js
    chmod +x start-all.js
    chmod +x install.sh
    
    print_success "Permissions set"
}

# Check system requirements
check_system() {
    print_step "Checking system requirements..."
    
    # Check available memory
    if command -v free &> /dev/null; then
        MEMORY_MB=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$MEMORY_MB" -lt 512 ]; then
            print_warning "Low available memory: ${MEMORY_MB}MB. Recommended: 512MB+"
        else
            print_success "Memory check passed: ${MEMORY_MB}MB available"
        fi
    fi
    
    # Check disk space
    if command -v df &> /dev/null; then
        DISK_SPACE_GB=$(df -BG . | awk 'NR==2{printf "%.0f", $4}' | sed 's/G//')
        if [ "$DISK_SPACE_GB" -lt 1 ]; then
            print_warning "Low disk space: ${DISK_SPACE_GB}GB. Recommended: 1GB+"
        else
            print_success "Disk space check passed: ${DISK_SPACE_GB}GB available"
        fi
    fi
}

# Main installation function
main() {
    print_header
    
    print_info "This script will install CatchTwo Enhanced with all dependencies"
    print_info "Make sure you have a stable internet connection"
    echo ""
    
    # Ask for confirmation
    read -p "$(print_color $CYAN 'Do you want to continue with the installation? (y/N): ')" -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installation cancelled"
        exit 0
    fi
    
    echo ""
    print_step "Starting installation process..."
    echo ""
    
    # Run installation steps
    check_nodejs
    check_npm
    check_system
    check_required_files
    create_directories
    install_dependencies
    create_default_files
    set_permissions
    
    echo ""
    print_success "Installation completed successfully!"
    echo ""
    
    print_color $GREEN "🎉 CatchTwo Enhanced is now installed!"
    echo ""
    
    print_color $CYAN "📖 Next Steps:"
    print_color $YELLOW "1. Run the setup wizard: node setup.js"
    print_color $YELLOW "2. Configure your tokens and settings"
    print_color $YELLOW "3. Start the system: node start-all.js"
    echo ""
    
    print_color $CYAN "🔧 Alternative Commands:"
    print_color $YELLOW "• Autocatcher only: node index-fixed.js"
    print_color $YELLOW "• Discord bot only: node bot.js"
    print_color $YELLOW "• Web dashboard: http://localhost:3000"
    echo ""
    
    print_color $CYAN "📚 Documentation:"
    print_color $YELLOW "• Enhanced README: ENHANCED-README.md"
    print_color $YELLOW "• Original README: README.md"
    print_color $YELLOW "• Support server: https://discord.gg/tXa2Hw5jHy"
    echo ""
    
    print_color $PURPLE "⚠️  Important:"
    print_color $YELLOW "• Keep your Discord tokens secure"
    print_color $YELLOW "• Follow Discord Terms of Service"
    print_color $YELLOW "• Use captcha solving responsibly"
    echo ""
    
    # Ask if user wants to run setup
    read -p "$(print_color $CYAN 'Would you like to run the setup wizard now? (y/N): ')" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        print_step "Starting setup wizard..."
        node setup.js
    else
        print_info "You can run the setup wizard later with: node setup.js"
    fi
    
    echo ""
    print_color $GREEN "✨ Enjoy using CatchTwo Enhanced! ✨"
}

# Run the installation
main "$@"