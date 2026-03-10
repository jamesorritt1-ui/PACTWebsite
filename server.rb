require 'webrick'
require 'socket'

root = File.dirname(__FILE__)

server = WEBrick::HTTPServer.new(
  :Port => 8080,
  :DocumentRoot => root,
  :BindAddress => '0.0.0.0'
)

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

server.start