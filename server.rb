require 'webrick'
require 'socket'

root = File.dirname(__FILE__)

# Vercel serves pages without the .html extension (cleanUrls in vercel.json),
# so internal links point at /team, /contact and so on. This handler does the
# same locally: /team serves team.html when that file exists.
class CleanUrlFileHandler < WEBrick::HTTPServlet::FileHandler
  def service(req, res)
    path = req.path_info.to_s.sub(%r{/\z}, '')
    if !path.empty? && File.extname(path).empty?
      candidate = File.join(@root, "#{path}.html")
      req.path_info = "#{path}.html" if File.file?(candidate)
    end
    super
  end
end

server = WEBrick::HTTPServer.new(
  :Port => 8080,
  :DocumentRoot => root,
  :BindAddress => '0.0.0.0'
)
server.mount('/', CleanUrlFileHandler, root)

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

server.start
