source "https://rubygems.org"

# Use Jekyll 3.x for better compatibility
gem "jekyll", "~> 3.9"

# Use the latest Minimal Mistakes theme compatible with Jekyll 3.x
gem "minimal-mistakes-jekyll", "~> 4.24"

# Required for Jekyll 3.0+
gem "webrick", "~> 1.8"

# Jekyll plugins
group :jekyll_plugins do
  gem "jekyll-paginate"
  gem "jekyll-sitemap"
  gem "jekyll-gist"
  gem "jekyll-feed"
  gem "jekyll-include-cache"
  gem "jekyll-archives"
end

# Required dependencies
gem "kramdown-parser-gfm"
gem "faraday-retry"

# Extracted from stdlib in Ruby 3.4+; needed by Jekyll 3.x deps (safe_yaml, liquid)
gem "base64"
gem "bigdecimal"

# Platform specific gems
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]
gem "wdm", "~> 0.1.0" if Gem.win_platform?