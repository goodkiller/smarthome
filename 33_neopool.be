#######################################################################
# PROPERTY OF QILOWATT.IT                                             #
# DISCLOSURE OR COPYING IS STRICTLY PROHIBITED AND MAY BE UNLAWFUL.   #
#######################################################################

class NeoPool
    def init()
    
        # Init driver
        tasmota.add_driver(self)
        tasmota.add_rule("POWER1#State", / args -> self.toggle_pool(args))
    end

    def toggle_pool(state)

        # Turn pool ON
        if state == 1
            # Filtration ON
            tasmota.cmd("NPFiltration 1")
            log("[QW][NeoPool] Filtration ON", 2)
            tasmota.resp_cmnd_str("Filtration ON")

            # Wait 15 seconds, then turn mode to HEAT
            tasmota.set_timer(1000 * 15, def ()
                tasmota.cmd("NPFiltrationmode 2")
                log("[QW][NeoPool] Filtration mode HEAT", 2)
                tasmota.resp_cmnd_str("Filtration mode HEAT")
            end)

        # Turn pool OFF
        elif state == 0

            # Filtration OFF
            tasmota.cmd("NPFiltration 0")
            log("[QW][NeoPool] Filtration OFF", 2)
            tasmota.resp_cmnd_str("Filtration OFF")
        end
    end
end

NeoPool()
